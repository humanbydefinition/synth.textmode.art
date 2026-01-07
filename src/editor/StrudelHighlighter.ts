/**
 * StrudelHighlighter - Real-time pattern highlighting for Strudel code
 * 
 * Shows which parts of the code are currently playing by highlighting
 * the corresponding code locations when haps (events) trigger.
 */
import * as monaco from 'monaco-editor';

/**
 * Strudel location format: character offsets from start of document
 * This is what's stored in hap.context.locations
 */
export interface HapLocation {
    start: number;  // Character offset from start of document
    end: number;    // Character offset from start of document
}

export interface Hap {
    whole?: { begin: { valueOf(): number }; end: { valueOf(): number }; duration: number };
    part?: { begin: { valueOf(): number }; end: { valueOf(): number } };
    context?: {
        locations?: HapLocation[];
    };
    value?: {
        color?: string;
    };
    hasOnset?(): boolean;
}

export interface Pattern {
    queryArc(begin: number, end: number): Hap[];
}

export interface StrudelHighlighterOptions {
    editor: monaco.editor.IStandaloneCodeEditor;
    /** Lookahead time in cycles for querying pattern */
    lookahead?: number;
    /** How long highlights remain visible (ms) */
    highlightDuration?: number;
    /** Default highlight color */
    defaultColor?: string;
}

interface ActiveHighlight {
    decorationId: string;
    expiresAt: number;
}

/**
 * StrudelHighlighter manages real-time code highlighting
 * synchronized with pattern playback
 */
export class StrudelHighlighter {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private pattern: Pattern | null = null;
    private getCycle: (() => number) | null = null;
    private animationFrameId: number | null = null;
    private activeHighlights: Map<string, ActiveHighlight> = new Map();
    private decorationCollection: monaco.editor.IEditorDecorationsCollection;
    private lookahead: number;
    private highlightDuration: number;
    private defaultColor: string;
    private isRunning = false;
    private lastQueryCycle = -1;

    constructor(options: StrudelHighlighterOptions) {
        this.editor = options.editor;
        this.lookahead = options.lookahead ?? 0.1;
        this.highlightDuration = options.highlightDuration ?? 300;
        this.defaultColor = options.defaultColor ?? 'var(--strudel-highlight, #75baff)';
        this.decorationCollection = this.editor.createDecorationsCollection([]);
    }

    /**
     * Set the current pattern and time functions from the Strudel scheduler
     */
    setPattern(pattern: Pattern | null, _getTime: () => number, getCycle: () => number): void {
        this.pattern = pattern;
        // Note: getTime is kept in the API for future use but currently only getCycle is needed
        this.getCycle = getCycle;
        // Reset query tracking when pattern changes to ensure highlights work on replay
        this.lastQueryCycle = -1;
        // Clear existing highlights when pattern changes
        this.clearAllHighlights();
    }

    /**
     * Start the highlight animation loop
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        // Reset query tracking to ensure highlights work immediately
        this.lastQueryCycle = -1;
        this.animate();
    }

    /**
     * Stop the highlight animation loop
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.clearAllHighlights();
    }

    /**
     * Clear all current highlights
     */
    clearAllHighlights(): void {
        this.activeHighlights.clear();
        this.decorationCollection.clear();
    }

    /**
     * Main animation loop that queries the pattern and updates highlights
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        this.updateHighlights();
        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    /**
     * Query pattern for current haps and update editor decorations
     */
    private updateHighlights(): void {
        const now = Date.now();
        const model = this.editor.getModel();
        
        if (!model || !this.pattern || !this.getCycle) {
            return;
        }

        try {
            const currentCycle = this.getCycle();
            
            // Only query if we've moved forward in time
            if (currentCycle > this.lastQueryCycle) {
                // Query pattern for haps in the current time window
                const haps = this.pattern.queryArc(
                    Math.max(0, currentCycle - 0.01), 
                    currentCycle + this.lookahead
                );

                // Process each hap
                for (const hap of haps) {
                    if (!hap.hasOnset?.() || !hap.context?.locations) continue;

                    for (const location of hap.context.locations) {
                        // Location is {start: number, end: number} - character offsets
                        const key = `${location.start}:${location.end}`;
                        
                        // Skip if already highlighted recently
                        const existing = this.activeHighlights.get(key);
                        if (existing && existing.expiresAt > now) continue;

                        // Create new highlight
                        this.addHighlight(location, hap.value?.color);
                    }
                }

                this.lastQueryCycle = currentCycle;
            }

            // Remove expired highlights
            this.cleanupExpiredHighlights(now);

        } catch (error) {
            // Pattern query can fail during code changes - ignore silently
            console.debug('[StrudelHighlighter] Query error:', error);
        }
    }

    /**
     * Convert character offset to Monaco position
     */
    private offsetToPosition(model: monaco.editor.ITextModel, offset: number): monaco.Position {
        // Monaco models have a method for this
        return model.getPositionAt(offset);
    }

    /**
     * Add a highlight decoration at the specified location
     */
    private addHighlight(location: HapLocation, color?: string): void {
        const model = this.editor.getModel();
        if (!model) return;

        // Key using character offsets
        const key = `${location.start}:${location.end}`;
        const now = Date.now();

        // Remove existing highlight for this location
        const existing = this.activeHighlights.get(key);
        if (existing) {
            // Refresh the expiration
            existing.expiresAt = now + this.highlightDuration;
            return;
        }

        // Convert character offsets to Monaco positions
        const startPos = this.offsetToPosition(model, location.start);
        const endPos = this.offsetToPosition(model, location.end);

        // Create decoration range
        const range = new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
        );

        // Validate range is within document
        const docLength = model.getValueLength();
        if (location.start < 0 || location.end > docLength || location.start >= location.end) {
            return;
        }

        // Create the highlight color
        const highlightColor = color || this.defaultColor;
        
        // Generate unique class name for this highlight's CSS
        const className = `strudel-highlight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Add CSS for this specific highlight (with animation)
        this.injectHighlightStyle(className, highlightColor);

        // Create the new decoration
        const newDecoration: monaco.editor.IModelDeltaDecoration = {
            range,
            options: {
                className,
                inlineClassName: className,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            }
        };

        // Add to collection
        const ids = model.deltaDecorations([], [newDecoration]);
        
        if (ids.length > 0) {
            this.activeHighlights.set(key, {
                decorationId: ids[0],
                expiresAt: now + this.highlightDuration,
            });

            // Schedule cleanup of CSS after animation
            setTimeout(() => {
                this.removeHighlightStyle(className);
            }, this.highlightDuration + 100);
        }
    }

    /**
     * Inject CSS for a specific highlight with fade animation
     */
    private injectHighlightStyle(className: string, color: string): void {
        const style = document.createElement('style');
        style.id = `strudel-style-${className}`;
        style.textContent = `
            .${className} {
                background-color: ${this.hexToRgba(color, 0.5)};
                border-radius: 2px;
                animation: strudel-flash ${this.highlightDuration}ms ease-out forwards;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Remove injected CSS for a highlight
     */
    private removeHighlightStyle(className: string): void {
        const style = document.getElementById(`strudel-style-${className}`);
        if (style) {
            style.remove();
        }
    }

    /**
     * Clean up expired highlight decorations
     */
    private cleanupExpiredHighlights(now: number): void {
        const model = this.editor.getModel();
        if (!model) return;

        const expired: string[] = [];
        const decorationIds: string[] = [];

        for (const [key, highlight] of this.activeHighlights) {
            if (highlight.expiresAt <= now) {
                expired.push(key);
                decorationIds.push(highlight.decorationId);
            }
        }

        // Remove expired decorations
        if (decorationIds.length > 0) {
            model.deltaDecorations(decorationIds, []);
        }

        // Remove from tracking
        for (const key of expired) {
            this.activeHighlights.delete(key);
        }
    }

    /**
     * Convert color to rgba with alpha
     */
    private hexToRgba(color: string, alpha: number): string {
        // Handle CSS variables
        if (color.startsWith('var(')) {
            return color.replace(')', `, ${alpha})`).replace('var(', 'var(');
        }

        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const bigint = parseInt(hex.length === 3 
                ? hex.split('').map(c => c + c).join('')
                : hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // Handle rgb/rgba
        if (color.startsWith('rgb')) {
            if (color.startsWith('rgba')) {
                return color;
            }
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }

        // Named colors - just add transparency via background
        return color;
    }

    /**
     * Dispose of the highlighter
     */
    dispose(): void {
        this.stop();
        this.decorationCollection.clear();
    }
}

/**
 * CSS keyframes for the highlight animation (injected once)
 */
export function injectStrudelHighlightStyles(): void {
    if (document.getElementById('strudel-highlight-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'strudel-highlight-keyframes';
    style.textContent = `
        @keyframes strudel-flash {
            0% {
                background-color: rgba(117, 186, 255, 0.7);
                box-shadow: 0 0 10px rgba(117, 186, 255, 0.5);
            }
            50% {
                background-color: rgba(117, 186, 255, 0.4);
                box-shadow: 0 0 6px rgba(117, 186, 255, 0.3);
            }
            100% {
                background-color: transparent;
                box-shadow: none;
            }
        }

        /* High-contrast outline style as alternative */
        @keyframes strudel-outline {
            0% {
                outline: 2px solid rgba(117, 186, 255, 0.9);
                outline-offset: 0px;
            }
            100% {
                outline: 2px solid transparent;
                outline-offset: 2px;
            }
        }
    `;
    document.head.appendChild(style);
}
