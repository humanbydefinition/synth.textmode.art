/**
 * Runtime-related type definitions for the live coding environment.
 * These interfaces define contracts for host-runner communication.
 */

/**
 * Error information from code execution
 */
export interface RuntimeError {
    /** Error message */
    message: string;
    /** Full stack trace */
    stack?: string;
    /** Line number in user code (1-indexed) */
    line?: number;
    /** Column number in user code (1-indexed) */
    column?: number;
}

/**
 * Events emitted by the runtime
 */
export interface IRuntimeEvents {
    /** Called when the runner is ready to accept code */
    onReady(): void;
    /** Called when code executes successfully */
    onRunOk(timestamp: number): void;
    /** Called when code execution fails */
    onRunError(error: RuntimeError): void;
}

/**
 * Host runtime interface - manages iframe lifecycle from parent window
 */
export interface IHostRuntime {
    /** Initialize the runtime (create iframe) */
    init(): void;
    /** Run code with debounce */
    runCode(code: string): void;
    /** Run code immediately without debounce */
    forceRun(code: string): void;
    /** Soft reset (reset frameCount to 0) and re-run code */
    softReset(code: string): void;
    /** Set debounce delay in milliseconds */
    setDebounceMs(ms: number): void;
    /** Cleanup resources */
    dispose(): void;
}

/**
 * Options for creating a host runtime
 */
export interface HostRuntimeOptions extends Partial<IRuntimeEvents> {
    /** Container element for the iframe */
    container: HTMLElement;
}
