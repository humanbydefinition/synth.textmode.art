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
let lastWorkingCode: string | null = null;
let isRecovering = false;
let currentCode: string | null = null;

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
 * Attempt to revert to last working code
 */
function attemptRevert() {
    if (isRecovering) return; // Prevent infinite recursion
    if (!lastWorkingCode) return; // No code to revert to
    if (currentCode === lastWorkingCode) return; // Already on last working code, nothing we can do

    console.log('Reverting to last working code due to error...');
    isRecovering = true;

    // We want to run the old code, but keep the error state reported to the user
    // The parent will show the red error marker, but the visual will revert to the last working state
    try {
        // Run the last working code without updating currentCode to it initially
        // so if IT fails, we don't loop. Actually, executeCode updates currentCode.
        executeCode(lastWorkingCode, true);
    } catch (e) {
        console.error('Failed to revert to last working code:', e);
    } finally {
        isRecovering = false;
    }
}

/**
 * Execute user code
 */
function executeCode(code: string, isRevert: boolean = false): void {
    // If we are recovering, we don't want to dispose the current (broken) state if it's already broken?
    // No, we always want a clean slate for the new run.

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

    // Prepare globals object
    const globals: Record<string, unknown> = {
        // Textmode instance
        t,
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

    currentCode = code;

    try {
        // Create function from code
        const fn = new Function(...globalKeys, `"use strict";\n${code}`);

        // Execute and capture return value
        const result = fn(...globalValues);

        // If user returns a function, store it as dispose callback
        if (typeof result === 'function') {
            userDispose = result;
        }

        if (!isRevert) {
            // Only update last working code if this wasn't a revert action
            // AND we successfully executed safely (synchronously at least)
            lastWorkingCode = code;
            sendMessage({ type: 'RUN_OK', timestamp: Date.now() });
        }

    } catch (error) {
        reportError(error as Error);

        // If this failed synchronously, try to revert immediately
        if (!isRevert) {
            attemptRevert();
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
            executeCode(msg.code);
            break;
        case 'SOFT_RESET':
            // Reset frameCount to 0 and re-run code
            if (t) {
                (t as unknown as { frameCount: number }).frameCount = 0;
            }
            executeCode(msg.code);
            break;
    }
}

/**
 * Global Error Handlers
 */
function setupErrorHandlers() {
    window.addEventListener('error', (event) => {
        reportError(event.error || event.message);
        attemptRevert();
    });

    window.addEventListener('unhandledrejection', (event) => {
        reportError(event.reason);
        attemptRevert();
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
