/**
 * Type declarations for @strudel/web
 * 
 * Strudel doesn't ship with TypeScript types, so we declare the module
 * and the functions we use from it.
 */

declare module '@strudel/web' {
    export interface StrudelInitOptions {
        /**
         * Function to load samples before initialization completes
         */
        prebake?: () => Promise<void>;
        /**
         * Whether to auto-start the audio scheduler
         */
        autostart?: boolean;
        /**
         * Error callback for evaluation errors
         * Strudel catches errors internally and calls this instead of throwing
         */
        onEvalError?: (error: Error) => void;
    }

    /**
     * The Strudel repl instance returned by initStrudel()
     * Note: hush() and evaluate() are available as module exports, not on this object
     */
    export interface StrudelRepl {
        /**
         * Stop all audio patterns
         */
        stop: () => void;
        /**
         * The Web Audio scheduler
         */
        scheduler?: unknown;
    }

    /**
     * Initialize the Strudel audio engine
     * Returns the repl object. Note: hush() and evaluate() are module-level exports.
     */
    export function initStrudel(options?: StrudelInitOptions): Promise<StrudelRepl>;

    /**
     * Load samples from a URL (usually a GitHub repo)
     * @param url - Sample source, e.g., 'github:tidalcycles/dirt-samples'
     */
    export function samples(url: string): Promise<void>;

    /**
     * Evaluate Strudel code directly (after initialization)
     * This is a module-level export, not a method on the repl
     */
    export function evaluate(code: string): Promise<unknown>;

    /**
     * Stop all audio (hush)
     * This is a module-level export, not a method on the repl
     */
    export function hush(): void;
}
