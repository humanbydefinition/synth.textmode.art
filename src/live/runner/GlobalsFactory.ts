/**
 * GlobalsFactory - creates tracked global functions for user code execution.
 * Wraps browser APIs to enable automatic resource cleanup when code is replaced.
 */
import type { IScopeTracker, IGlobalsFactory, TrackedGlobals } from '../types';

/**
 * Creates globals that automatically track resources for cleanup
 */
export class GlobalsFactory implements IGlobalsFactory {
    /**
     * Create tracked globals for a scope
     */
    create(scope: IScopeTracker): TrackedGlobals {
        return {
            setTimeout: this.createTrackedSetTimeout(scope),
            clearTimeout: this.createTrackedClearTimeout(scope),
            setInterval: this.createTrackedSetInterval(scope),
            clearInterval: this.createTrackedClearInterval(scope),
            requestAnimationFrame: this.createTrackedRAF(scope),
            cancelAnimationFrame: this.createTrackedCancelRAF(scope),
            addEventListener: this.createTrackedAddEventListener(scope),
            onDispose: (fn: () => void) => scope.onDispose(fn),
        };
    }

    private createTrackedSetTimeout(scope: IScopeTracker) {
        return (handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
            const id = setTimeout(handler, timeout, ...args);
            scope.trackTimeout(id);
            return id;
        };
    }

    private createTrackedClearTimeout(scope: IScopeTracker) {
        return (id: number | undefined): void => {
            if (id !== undefined) {
                scope.untrackTimeout(id);
                clearTimeout(id);
            }
        };
    }

    private createTrackedSetInterval(scope: IScopeTracker) {
        return (handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
            const id = setInterval(handler, timeout, ...args);
            scope.trackInterval(id);
            return id;
        };
    }

    private createTrackedClearInterval(scope: IScopeTracker) {
        return (id: number | undefined): void => {
            if (id !== undefined) {
                scope.untrackInterval(id);
                clearInterval(id);
            }
        };
    }

    private createTrackedRAF(scope: IScopeTracker) {
        return (callback: FrameRequestCallback): number => {
            const id = requestAnimationFrame((time) => {
                scope.untrackRAF(id);
                callback(time);
            });
            scope.trackRAF(id);
            return id;
        };
    }

    private createTrackedCancelRAF(scope: IScopeTracker) {
        return (id: number): void => {
            scope.untrackRAF(id);
            cancelAnimationFrame(id);
        };
    }

    private createTrackedAddEventListener(scope: IScopeTracker) {
        return (
            target: EventTarget,
            type: string,
            handler: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions
        ): void => {
            target.addEventListener(type, handler, options);
            scope.trackEventListener(target, type, handler, options);
        };
    }
}

/**
 * Standard browser globals to expose to user code
 */
export const STANDARD_GLOBALS: Record<string, unknown> = {
    // Console passthrough
    console,
    // Math and common browser APIs
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    // For advanced users
    window,
    document,
};
