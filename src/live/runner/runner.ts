/**
 * Iframe runner - executes user sketch code with textmode.js and synth globals.
 * This script runs inside the sandboxed iframe.
 */
import { textmode } from 'textmode.js';
import {
    SynthPlugin,
    src,
    osc,
    noise,
    gradient,
    solid,
    shape,
    char,
    voronoi,
    charColor,
    cellColor,
    paint
} from 'textmode.synth.js';
import { createFiltersPlugin } from 'textmode.filters.js'
import { ScopeTracker } from './scope';
import type { RunnerToParentMessage, ParentToRunnerMessage } from '../protocol';

// State
let t: ReturnType<typeof textmode.create> | null = null;
let currentScope: ScopeTracker | null = null;
let userDispose: (() => void) | null = null;

// Frame synchronization state
let pendingExecution: { code: string; isSoftReset: boolean } | null = null;
let executionGeneration = 0; // Incremented for each new execution request to cancel stale RAFs
let drawErrorOccurred = false;

/**
 * Initialize the textmode instance
 */
function initTextmode(): void {
    if (t) return;

    t = textmode.create({
        width: window.innerWidth,
        height: window.innerHeight,
        plugins: [SynthPlugin, createFiltersPlugin()],
    });

    document.body.appendChild(t.canvas);

    // Handle resize
    window.addEventListener('resize', () => {
        if (t) {
            t.resizeCanvas(window.innerWidth, window.innerHeight);
        }
    });
}

/**
 * Send message to parent window
 */
function sendMessage(msg: RunnerToParentMessage): void {
    window.parent.postMessage(msg, '*');
}

/**
 * Create wrapped globals that track resources
 */
function createTrackedGlobals(scope: ScopeTracker) {
    const trackedSetTimeout = (
        handler: TimerHandler,
        timeout?: number,
        ...args: unknown[]
    ): number => {
        const id = setTimeout(handler, timeout, ...args);
        scope.trackTimeout(id);
        return id;
    };

    const trackedClearTimeout = (id: number | undefined): void => {
        if (id !== undefined) {
            scope.untrackTimeout(id);
            clearTimeout(id);
        }
    };

    const trackedSetInterval = (
        handler: TimerHandler,
        timeout?: number,
        ...args: unknown[]
    ): number => {
        const id = setInterval(handler, timeout, ...args);
        scope.trackInterval(id);
        return id;
    };

    const trackedClearInterval = (id: number | undefined): void => {
        if (id !== undefined) {
            scope.untrackInterval(id);
            clearInterval(id);
        }
    };

    const trackedRequestAnimationFrame = (callback: FrameRequestCallback): number => {
        const id = requestAnimationFrame((time) => {
            scope.untrackRAF(id);
            callback(time);
        });
        scope.trackRAF(id);
        return id;
    };

    const trackedCancelAnimationFrame = (id: number): void => {
        scope.untrackRAF(id);
        cancelAnimationFrame(id);
    };

    const trackedAddEventListener = (
        target: EventTarget,
        type: string,
        handler: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void => {
        target.addEventListener(type, handler, options);
        scope.trackEventListener(target, type, handler, options);
    };

    return {
        setTimeout: trackedSetTimeout,
        clearTimeout: trackedClearTimeout,
        setInterval: trackedSetInterval,
        clearInterval: trackedClearInterval,
        requestAnimationFrame: trackedRequestAnimationFrame,
        cancelAnimationFrame: trackedCancelAnimationFrame,
        addEventListener: trackedAddEventListener,
        onDispose: (fn: () => void) => scope.onDispose(fn),
    };
}

/**
 * Report error to parent
 */
function reportError(error: Error | string | Event) {
    let message = '';
    let stack: string | undefined;
    let line: number | undefined;
    let column: number | undefined;

    if (error instanceof Error) {
        message = error.message;
        stack = error.stack;

        // Try to extract line/column from stack trace
        const stackMatch = stack?.match(/<anonymous>:(\d+):(\d+)/);
        if (stackMatch) {
            // Subtract 1 for the "use strict" line we added
            line = parseInt(stackMatch[1], 10) - 1;
            column = parseInt(stackMatch[2], 10);
        }
    } else if (typeof error === 'string') {
        message = error;
    } else {
        message = String(error);
    }

    sendMessage({
        type: 'RUN_ERROR',
        message: message,
        stack,
        line,
        column,
    });
}

/**
 * Validate code syntax without executing it
 */
function validateCode(code: string): { valid: boolean; error?: Error } {
    try {
        new Function(code);
        return { valid: true };
    } catch (error) {
        return { valid: false, error: error as Error };
    }
}

/**
 * Wrap a draw callback to catch errors without crashing
 */
function wrapDrawCallback(callback: () => void): () => void {
    return () => {
        if (drawErrorOccurred) return; // Skip if in error state
        try {
            callback();
        } catch (error) {
            drawErrorOccurred = true;
            reportError(error as Error);
            // Don't crash - just freeze on last good frame
        }
    };
}

/**
 * Create a proxy for textmode that wraps draw callbacks
 */
function createSafeTextmodeProxy(original: NonNullable<typeof t>): NonNullable<typeof t> {
    return new Proxy(original, {
        get(target, prop) {
            const value = (target as unknown as Record<string | symbol, unknown>)[prop];

            if (prop === 'draw') {
                return (callback: () => void) => target.draw(wrapDrawCallback(callback));
            }

            if (prop === 'layers') {
                return createLayerManagerProxy(target.layers);
            }

            return value;
        }
    });
}

/**
 * Create a proxy for layer manager that wraps layer.draw() calls
 */
function createLayerManagerProxy(layers: NonNullable<typeof t>['layers']) {
    return new Proxy(layers, {
        get(target, prop) {
            const value = (target as unknown as Record<string | symbol, unknown>)[prop];

            if (prop === 'base') {
                return createLayerProxy(target.base);
            }

            if (prop === 'add') {
                return (options?: Parameters<typeof target.add>[0]) => {
                    const layer = target.add(options);
                    return createLayerProxy(layer);
                };
            }

            if (prop === 'all') {
                return (target.all as Array<typeof target.base>).map(layer => createLayerProxy(layer));
            }

            return value;
        }
    });
}

/**
 * Create a proxy for a single layer that wraps its draw callback
 */
function createLayerProxy(layer: NonNullable<typeof t>['layers']['base']) {
    return new Proxy(layer, {
        get(target, prop) {
            const value = (target as unknown as Record<string | symbol, unknown>)[prop];

            if (prop === 'draw') {
                return (callback: () => void) => target.draw(wrapDrawCallback(callback));
            }

            if (typeof value === 'function') {
                return value.bind(target);
            }

            return value;
        }
    });
}

/**
 * Process pending execution when frame is safe
 */
function processPendingExecution(): void {
    if (!pendingExecution) return;

    // Double-check we're not mid-render
    if (t?.isRenderingFrame) {
        // Still rendering, try again next frame
        requestAnimationFrame(() => processPendingExecution());
        return;
    }

    const { code, isSoftReset } = pendingExecution;
    pendingExecution = null;
    executeCodeInternal(code, isSoftReset);
}

/**
 * Schedule execution at the safest possible moment - the start of a frame
 * before any rendering has begun. Uses double-RAF to ensure we catch the
 * very beginning of a frame.
 */
function scheduleFrameSafeExecution(code: string, isSoftReset: boolean): void {
    // Increment generation to invalidate any pending RAF chains
    const thisGeneration = ++executionGeneration;
    pendingExecution = { code, isSoftReset };

    // First RAF: wait for current frame to complete its callback phase
    requestAnimationFrame(() => {
        // Check if this execution was superseded by a newer one
        if (thisGeneration !== executionGeneration) return;

        // Second RAF: now we're at the very start of the next frame,
        // before textmode's render loop has been called
        requestAnimationFrame(() => {
            // Check again in case a newer execution was scheduled
            if (thisGeneration !== executionGeneration) return;

            processPendingExecution();
        });
    });
}

/**
 * Safe entry point that validates code and ensures frame-safe execution
 */
function safeExecuteCode(code: string, isSoftReset: boolean = false): void {
    // Validate syntax first - reject broken code immediately
    const validation = validateCode(code);
    if (!validation.valid) {
        reportError(validation.error!);
        return; // Keep current code running
    }

    // Always schedule for next safe frame boundary to avoid any timing issues
    // The double-RAF pattern ensures we execute before textmode's render loop
    scheduleFrameSafeExecution(code, isSoftReset);
}

/**
 * Internal code execution (called after validation and frame-sync)
 */
function executeCodeInternal(code: string, isSoftReset: boolean): void {
    // Reset draw error state for new execution
    drawErrorOccurred = false;

    if (t) {
        // CRITICAL: Pause the animation loop before any cleanup
        // This prevents the render loop from running while we dispose layers
        t.noLoop();

        try {
            // Clear base layer's draw callback first to prevent stale references
            t.layers.base.draw(() => { });

            // Clear draw callbacks on all user layers before clearing them
            t.layers.all.forEach(layer => {
                layer.draw(() => { });
            });

            t.layers.clear();

            // For soft reset, also reset frame count
            if (isSoftReset) {
                t.frameCount = 0;
                t.secs = 0;

                // Clear synth on all layers (base layer uses same pattern)
                (t.layers.base as unknown as { clearSynth(): void }).clearSynth();

                t.layers.all.forEach(layer => {
                    (layer as unknown as { clearSynth(): void }).clearSynth();
                });
            }
        } catch (e) {
            console.warn('Error during layer cleanup:', e);
        }
    }

    // Dispose previous execution resources
    if (userDispose) {
        try {
            userDispose();
        } catch (e) {
            console.warn('Error in user dispose:', e);
        }
        userDispose = null;
    }

    if (currentScope) {
        currentScope.dispose();
    }

    // Create new scope
    currentScope = new ScopeTracker();
    const trackedGlobals = createTrackedGlobals(currentScope);

    // Create safe proxy for textmode that wraps draw callbacks
    const safeT = t ? createSafeTextmodeProxy(t) : null;

    // Prepare globals object
    const globals: Record<string, unknown> = {
        // Textmode instance (proxied for safe draw callbacks)
        t: safeT,
        // Synth exports
        src,
        osc,
        noise,
        gradient,
        solid,
        shape,
        voronoi,
        charColor,
        cellColor,
        paint,
        char,
        SynthPlugin,
        // Tracked utilities
        ...trackedGlobals,
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

    const globalKeys = Object.keys(globals);
    const globalValues = Object.values(globals);

    try {
        // Create function from code
        const fn = new Function(...globalKeys, `"use strict";\n${code}`);

        // Execute and capture return value
        const result = fn(...globalValues);

        // If user returns a function, store it as dispose callback
        if (typeof result === 'function') {
            userDispose = result;
        }

        // Report success
        sendMessage({ type: 'RUN_OK', timestamp: Date.now() });

    } catch (error) {
        reportError(error as Error);
        // Error reported, but keep previous working state running
    } finally {
        // CRITICAL: Resume the animation loop after code execution
        // This must always run, even if code execution fails
        if (t) {
            t.loop();
        }
    }
}

/**
 * Handle messages from parent
 */
function handleMessage(event: MessageEvent<ParentToRunnerMessage>): void {
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

    switch (msg.type) {
        case 'RUN_CODE':
            safeExecuteCode(msg.code, false);
            break;
        case 'SOFT_RESET':
            safeExecuteCode(msg.code, true);
            break;
    }
}

/**
 * Global Error Handlers
 */
function setupErrorHandlers() {
    window.addEventListener('error', (event) => {
        reportError(event.error || event.message);
        drawErrorOccurred = true; // Freeze frame on error
    });

    window.addEventListener('unhandledrejection', (event) => {
        reportError(event.reason);
        drawErrorOccurred = true; // Freeze frame on error
    });
}

/**
 * Initialize runner
 */
function init(): void {
    setupErrorHandlers();

    // Initialize textmode
    initTextmode();

    // Listen for parent messages
    window.addEventListener('message', handleMessage);

    // Signal ready
    sendMessage({ type: 'READY' });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
