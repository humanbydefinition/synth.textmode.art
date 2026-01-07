/**
 * StrudelRuntime - manages Strudel audio engine lifecycle and code evaluation
 * Uses @strudel/web for direct integration (no iframe needed for audio)
 */

export interface StrudelRuntimeOptions {
    onReady?: () => void;
    onError?: (error: StrudelError) => void;
    onPatternUpdate?: (pattern: StrudelPattern | null) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
}

export interface StrudelError {
    message: string;
    stack?: string;
    line?: number;
    column?: number;
}

/** Minimal typing for Strudel Pattern for highlighting purposes */
export interface StrudelHapLocation {
    start: { line: number; column: number };
    end: { line: number; column: number };
}

export interface StrudelHap {
    whole?: { begin: { valueOf(): number }; end: { valueOf(): number }; duration: number };
    part?: { begin: { valueOf(): number }; end: { valueOf(): number } };
    context?: {
        locations?: StrudelHapLocation[];
    };
    value?: {
        color?: string;
    };
    hasOnset(): boolean;
}

export interface StrudelPattern {
    queryArc(begin: number, end: number): StrudelHap[];
}

export interface StrudelScheduler {
    now(): number;
    cps: number;
    started: boolean;
}

export interface StrudelRepl {
    scheduler: StrudelScheduler;
    evaluate: (code: string, autoplay?: boolean) => Promise<unknown>;
    start: () => void;
    stop: () => void;
    state: {
        pattern?: StrudelPattern;
        started: boolean;
    };
}

// Strudel adds these to the global window after initStrudel()
declare global {
    interface Window {
        hush?: () => void;
    }
}

// Store the evaluate function from Strudel
type EvaluateFunction = (code: string) => Promise<unknown>;
type HushFunction = () => void;

export class StrudelRuntime {
    private isInitialized = false;
    private isPlaying = false;
    private options: StrudelRuntimeOptions;
    private evaluateFn: EvaluateFunction | null = null;
    private hushFn: HushFunction | null = null;
    private repl: StrudelRepl | null = null;
    private currentPattern: StrudelPattern | null = null;
    private debounceTimer: number | null = null;
    private debounceMs = 300;
    private pendingCode: string | null = null;
    private evalErrorOccurred = false; // Track if onEvalError was called during evaluation

    constructor(options: StrudelRuntimeOptions) {
        this.options = options;
    }

    /**
     * Initialize Strudel audio engine
     * Must be called after user interaction due to Web Audio autoplay policy
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Dynamic import of @strudel/web
            const strudelWeb = await import('@strudel/web');
            
            // initStrudel() returns the repl object with scheduler and state
            // Pass onEvalError callback to capture evaluation errors
            // (Strudel catches errors internally and calls this callback instead of throwing)
            const repl = await strudelWeb.initStrudel({
                prebake: async () => {
                    // Load default samples from Strudel's CDN
                    await strudelWeb.samples('github:tidalcycles/dirt-samples');
                },
                onEvalError: (error: Error) => {
                    // Strudel calls this for evaluation errors instead of throwing
                    // Set flag so we don't call onPatternUpdate after error
                    this.evalErrorOccurred = true;
                    const parsed = this.parseError(error);
                    this.options.onError?.(parsed);
                },
            }) as unknown as StrudelRepl;

            // Store the repl for pattern/scheduler access
            this.repl = repl;

            // hush() and evaluate() are module exports from @strudel/web
            // They operate on the internal repl instance created by initStrudel()
            this.evaluateFn = strudelWeb.evaluate;
            this.hushFn = strudelWeb.hush;

            this.isInitialized = true;
            this.options.onReady?.();

            // Run pending code if any
            if (this.pendingCode !== null) {
                await this.evaluateImmediate(this.pendingCode);
                this.pendingCode = null;
            }
        } catch (error) {
            console.error('Failed to initialize Strudel:', error);
            this.options.onError?.({
                message: error instanceof Error ? error.message : 'Failed to initialize Strudel audio',
            });
        }
    }

    /**
     * Check if audio is initialized
     */
    getIsInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Evaluate Strudel code immediately
     */
    private async evaluateImmediate(code: string): Promise<void> {
        if (!this.isInitialized || !this.evaluateFn) {
            this.pendingCode = code;
            return;
        }

        // Reset error flag before evaluation
        this.evalErrorOccurred = false;
        
        try {
            const result = await this.evaluateFn(code);
            
            // If onEvalError was called, don't update pattern (error was handled)
            if (this.evalErrorOccurred) {
                return;
            }
            
            // The evaluate function returns the pattern
            this.currentPattern = result as StrudelPattern | null;
            this.isPlaying = true;
            this.options.onPlayStateChange?.(true);
            this.options.onPatternUpdate?.(this.currentPattern);
        } catch (error) {
            // This catch block handles errors that are actually thrown
            // (Strudel may catch internally and call onEvalError instead)
            const err = error as Error;
            const parsed = this.parseError(err);
            this.options.onError?.(parsed);
        }
    }

    /**
     * Evaluate code with debounce (for auto-execute mode)
     */
    evaluate(code: string): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.debounceTimer = null;
            this.evaluateImmediate(code);
        }, this.debounceMs);
    }

    /**
     * Force evaluate code immediately (Ctrl+Enter)
     */
    forceEvaluate(code: string): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.evaluateImmediate(code);
    }

    /**
     * Stop all audio (hush)
     * Uses the hush function returned from initStrudel()
     */
    hush(): void {
        if (!this.isInitialized) return;

        try {
            // Use the stored hush function from initStrudel()
            if (this.hushFn) {
                this.hushFn();
            }
            this.currentPattern = null;
            this.isPlaying = false;
            this.options.onPlayStateChange?.(false);
            this.options.onPatternUpdate?.(null);
        } catch (error) {
            console.error('Failed to stop Strudel:', error);
        }
    }

    /**
     * Check if audio is currently playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Get the current pattern for highlighting purposes
     */
    getPattern(): StrudelPattern | null {
        return this.currentPattern;
    }

    /**
     * Get the current cycle position from the scheduler
     */
    getCycle(): number {
        if (!this.repl?.scheduler) return 0;
        return this.repl.scheduler.now();
    }

    /**
     * Get the scheduler's audio time function
     */
    getTime(): number {
        // Use AudioContext time if available
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const audioContext = (window as any).strudel?.audioContext;
            if (audioContext) {
                return audioContext.currentTime;
            }
        } catch {
            // Fallback to performance time
        }
        return performance.now() / 1000;
    }

    /**
     * Set debounce delay
     */
    setDebounceMs(ms: number): void {
        this.debounceMs = ms;
    }

    /**
     * Parse an error into a StrudelError structure
     * Extracts line/column from stack trace or message
     */
    private parseError(error: Error): StrudelError {
        const message = error.message;
        const stack = error.stack;

        let line: number | undefined;
        let column: number | undefined;

        // First, try to extract from the message (Strudel's syntax errors)
        const lineMatch = message.match(/line (\d+)/i);
        const colMatch = message.match(/column (\d+)/i);

        if (lineMatch) {
            line = parseInt(lineMatch[1], 10);
        }
        if (colMatch) {
            column = parseInt(colMatch[1], 10);
        }

        // If not in message, try to parse from stack trace (runtime errors like TypeError)
        if (line === undefined && stack) {
            const parsed = this.parseStackTrace(stack);
            line = parsed.line;
            column = parsed.column;
        }

        return { message, stack, line, column };
    }

    /**
     * Parse stack trace to extract line and column numbers
     * Handles various stack trace formats from eval'd code
     */
    private parseStackTrace(stack: string): { line?: number; column?: number } {
        // Match pattern like "<anonymous>:5:10" or "eval:5:10" (common in eval'd code)
        const anonMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
        if (anonMatch) {
            return {
                line: parseInt(anonMatch[1], 10),
                column: parseInt(anonMatch[2], 10),
            };
        }

        // Match pattern like "eval at ..." followed by line:col
        const evalMatch = stack.match(/eval[^:]*:(\d+):(\d+)/);
        if (evalMatch) {
            return {
                line: parseInt(evalMatch[1], 10),
                column: parseInt(evalMatch[2], 10),
            };
        }

        // Match Function constructor pattern "Function:line:col"
        const fnMatch = stack.match(/Function:(\d+):(\d+)/);
        if (fnMatch) {
            return {
                line: parseInt(fnMatch[1], 10),
                column: parseInt(fnMatch[2], 10),
            };
        }

        return {};
    }

    /**
     * Cleanup
     */
    dispose(): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }
        this.hush();
    }
}