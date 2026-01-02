/**
 * ScopeTracker - Tracks and disposes resources created during sketch execution.
 * Handles timeouts, intervals, animation frames, event listeners, and custom disposers.
 */
export class ScopeTracker {
    private timeouts = new Set<number>();
    private intervals = new Set<number>();
    private rafs = new Set<number>();
    private listeners: Array<{
        target: EventTarget;
        type: string;
        handler: EventListenerOrEventListenerObject;
        options?: boolean | AddEventListenerOptions;
    }> = [];
    private disposers: Array<() => void> = [];

    /**
     * Track a setTimeout ID for automatic cleanup
     */
    trackTimeout(id: number): number {
        this.timeouts.add(id);
        return id;
    }

    /**
     * Track a setInterval ID for automatic cleanup
     */
    trackInterval(id: number): number {
        this.intervals.add(id);
        return id;
    }

    /**
     * Track a requestAnimationFrame ID for automatic cleanup
     */
    trackRAF(id: number): number {
        this.rafs.add(id);
        return id;
    }

    /**
     * Untrack a specific timeout (when cleared manually)
     */
    untrackTimeout(id: number): void {
        this.timeouts.delete(id);
    }

    /**
     * Untrack a specific interval (when cleared manually)
     */
    untrackInterval(id: number): void {
        this.intervals.delete(id);
    }

    /**
     * Untrack a specific RAF (when cancelled manually)
     */
    untrackRAF(id: number): void {
        this.rafs.delete(id);
    }

    /**
     * Track an event listener for automatic cleanup
     */
    trackEventListener(
        target: EventTarget,
        type: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void {
        this.listeners.push({ target, type, handler, options });
    }

    /**
     * Register a custom dispose function to be called on cleanup
     */
    onDispose(fn: () => void): void {
        this.disposers.push(fn);
    }

    /**
     * Dispose all tracked resources
     */
    dispose(): void {
        // Clear all timeouts
        for (const id of this.timeouts) {
            clearTimeout(id);
        }
        this.timeouts.clear();

        // Clear all intervals
        for (const id of this.intervals) {
            clearInterval(id);
        }
        this.intervals.clear();

        // Cancel all animation frames
        for (const id of this.rafs) {
            cancelAnimationFrame(id);
        }
        this.rafs.clear();

        // Remove all event listeners
        for (const { target, type, handler, options } of this.listeners) {
            target.removeEventListener(type, handler, options);
        }
        this.listeners = [];

        // Call custom disposers
        for (const dispose of this.disposers) {
            try {
                dispose();
            } catch (e) {
                console.warn('Error in custom disposer:', e);
            }
        }
        this.disposers = [];
    }
}
