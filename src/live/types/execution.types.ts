/**
 * Execution context type definitions for code execution in the runner.
 */

import type { RuntimeError } from './runtime.types';

/**
 * Result of code execution
 */
export interface ExecutionResult {
    /** Whether execution succeeded */
    success: boolean;
    /** Error information if failed */
    error?: RuntimeError;
    /** Optional cleanup function returned by user code */
    disposeCallback?: () => void;
}

/**
 * Validation result for code syntax checking
 */
export interface ValidationResult {
    /** Whether the code is syntactically valid */
    valid: boolean;
    /** Syntax error if invalid */
    error?: Error;
}

/**
 * Pending execution request
 */
export interface PendingExecution {
    /** Code to execute */
    code: string;
    /** Whether this is a soft reset */
    isSoftReset: boolean;
}

/**
 * Scope tracker interface - tracks resources for cleanup
 */
export interface IScopeTracker {
    /** Track a setTimeout ID */
    trackTimeout(id: number): number;
    /** Track a setInterval ID */
    trackInterval(id: number): number;
    /** Track a requestAnimationFrame ID */
    trackRAF(id: number): number;
    /** Untrack a specific timeout */
    untrackTimeout(id: number): void;
    /** Untrack a specific interval */
    untrackInterval(id: number): void;
    /** Untrack a specific RAF */
    untrackRAF(id: number): void;
    /** Track an event listener for cleanup */
    trackEventListener(
        target: EventTarget,
        type: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void;
    /** Register a custom dispose function */
    onDispose(fn: () => void): void;
    /** Dispose all tracked resources */
    dispose(): void;
}

/**
 * Factory for creating tracked global functions
 */
export interface IGlobalsFactory {
    /** Create tracked globals for a scope */
    create(scope: IScopeTracker): TrackedGlobals;
}

/**
 * Tracked global functions that auto-cleanup
 */
export interface TrackedGlobals {
    setTimeout: (handler: TimerHandler, timeout?: number, ...args: unknown[]) => number;
    clearTimeout: (id: number | undefined) => void;
    setInterval: (handler: TimerHandler, timeout?: number, ...args: unknown[]) => number;
    clearInterval: (id: number | undefined) => void;
    requestAnimationFrame: (callback: FrameRequestCallback) => number;
    cancelAnimationFrame: (id: number) => void;
    addEventListener: (
        target: EventTarget,
        type: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ) => void;
    onDispose: (fn: () => void) => void;
}

/**
 * Error reporter interface
 */
export interface IErrorReporter {
    /** Report an error to the parent window */
    report(error: Error | string | Event): void;
}

/**
 * Frame scheduler interface - handles frame-safe execution timing
 */
export interface IFrameScheduler {
    /** Schedule code execution at the next safe frame boundary */
    schedule(execution: PendingExecution): void;
    /** Cancel any pending execution */
    cancel(): void;
}
