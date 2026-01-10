/**
 * StrudelHighlighter - Real-time pattern highlighting for Strudel code
 * 
 * Uses duration-based highlighting: highlights remain visible for the entire
 * duration of each hap (musical event), matching the official Strudel approach.
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
}

interface ActiveDecoration {
    decorationId: string;
    hapEnd: number;  // Cycle time when this hap ends
}

/**
 * StrudelHighlighter manages real-time code highlighting
 * synchronized with pattern playback using duration-based tracking.
 */
export class StrudelHighlighter {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private pattern: Pattern | null = null;
    private getCycle: (() => number) | null = null;
    private animationFrameId: number | null = null;
    private activeDecorations: Map<string, ActiveDecoration> = new Map();
    private lookahead: number;
    private isRunning = false;

    // CSS class for all active highlights (no per-instance styles needed)
    private static readonly HIGHLIGHT_CLASS = 'strudel-highlight-active';

    constructor(options: StrudelHighlighterOptions) {
        this.editor = options.editor;
        this.lookahead = options.lookahead ?? 0.1;
    }

    /**
     * Set the current pattern and time functions from the Strudel scheduler
     */
    setPattern(pattern: Pattern | null, _getTime: () => number, getCycle: () => number): void {
        this.pattern = pattern;
        this.getCycle = getCycle;
        // Clear existing highlights when pattern changes
        this.clearAllHighlights();
    }

    /**
     * Start the highlight animation loop
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
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
        const model = this.editor.getModel();
        if (model) {
            const decorationIds = Array.from(this.activeDecorations.values()).map(d => d.decorationId);
            if (decorationIds.length > 0) {
                model.deltaDecorations(decorationIds, []);
            }
        }
        this.activeDecorations.clear();
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
     * Query pattern for current haps and update editor decorations.
     * Uses duration-based highlighting: shows highlights for haps that are
     * currently active (currentCycle is between hap.whole.begin and hap.whole.end).
     */
    private updateHighlights(): void {
        const model = this.editor.getModel();

        if (!model || !this.pattern || !this.getCycle) {
            return;
        }

        try {
            const currentCycle = this.getCycle();

            // Track which locations should be active this frame
            const activeLocationsThisFrame = new Map<string, { location: HapLocation; hapEnd: number; color?: string }>();

            // Query pattern for haps around current time
            // Look back slightly to catch ongoing haps and ahead for lookahead
            const haps = this.pattern.queryArc(
                Math.max(0, currentCycle - 1), // Look back 1 cycle to catch ongoing haps
                currentCycle + this.lookahead
            );

            // Find all haps that are currently active (current time is within their duration)
            for (const hap of haps) {
                if (!hap.whole || !hap.context?.locations) continue;

                const hapBegin = hap.whole.begin.valueOf();
                const hapEnd = hap.whole.end.valueOf();

                // Check if this hap is currently active
                if (currentCycle >= hapBegin && currentCycle < hapEnd) {
                    for (const location of hap.context.locations) {
                        const key = `${location.start}:${location.end}`;

                        // Keep the hap with the latest end time for each location
                        const existing = activeLocationsThisFrame.get(key);
                        if (!existing || hapEnd > existing.hapEnd) {
                            activeLocationsThisFrame.set(key, {
                                location,
                                hapEnd,
                                color: hap.value?.color
                            });
                        }
                    }
                }
            }

            // Remove decorations for locations that are no longer active
            const toRemove: string[] = [];
            const decorationIdsToRemove: string[] = [];

            for (const [key, decoration] of this.activeDecorations) {
                if (!activeLocationsThisFrame.has(key)) {
                    toRemove.push(key);
                    decorationIdsToRemove.push(decoration.decorationId);
                }
            }

            if (decorationIdsToRemove.length > 0) {
                model.deltaDecorations(decorationIdsToRemove, []);
                for (const key of toRemove) {
                    this.activeDecorations.delete(key);
                }
            }

            // Add decorations for newly active locations
            for (const [key, { location, hapEnd }] of activeLocationsThisFrame) {
                if (!this.activeDecorations.has(key)) {
                    this.addDecoration(model, location, key, hapEnd);
                }
            }

        } catch (error) {
            // Pattern query can fail during code changes - ignore silently
            console.debug('[StrudelHighlighter] Query error:', error);
        }
    }

    /**
     * Add a decoration at the specified location
     */
    private addDecoration(
        model: monaco.editor.ITextModel,
        location: HapLocation,
        key: string,
        hapEnd: number
    ): void {
        // Validate location is within document
        const docLength = model.getValueLength();
        if (location.start < 0 || location.end > docLength || location.start >= location.end) {
            return;
        }

        // Convert character offsets to Monaco positions
        const startPos = model.getPositionAt(location.start);
        const endPos = model.getPositionAt(location.end);

        // Create decoration range
        const range = new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
        );

        // Create the new decoration with outline style
        const newDecoration: monaco.editor.IModelDeltaDecoration = {
            range,
            options: {
                className: StrudelHighlighter.HIGHLIGHT_CLASS,
                inlineClassName: StrudelHighlighter.HIGHLIGHT_CLASS,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            }
        };

        // Add to model
        const ids = model.deltaDecorations([], [newDecoration]);

        if (ids.length > 0) {
            this.activeDecorations.set(key, {
                decorationId: ids[0],
                hapEnd,
            });
        }
    }

    /**
     * Dispose of the highlighter
     */
    dispose(): void {
        this.stop();
    }
}

/**
 * Inject global Strudel highlight styles (called once on init)
 * Uses outline + glow for visibility on any background
 */
export function injectStrudelHighlightStyles(): void {
    if (document.getElementById('strudel-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'strudel-highlight-styles';
    style.textContent = `
        .strudel-highlight-active {
            background-color: rgba(117, 186, 255, 0.2);
            outline: 1.5px solid rgba(117, 186, 255, 0.9);
            outline-offset: 1px;
            box-shadow: 
                0 0 6px rgba(117, 186, 255, 0.8),
                0 0 12px rgba(117, 186, 255, 0.4),
                0 0 20px rgba(117, 186, 255, 0.2);
            border-radius: 2px;
        }
    `;
    document.head.appendChild(style);
}
