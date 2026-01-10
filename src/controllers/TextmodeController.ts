/**
 * Textmode Controller - centralized textmode-specific logic.
 * Handles code execution, error management, and interaction with the textmode runtime.
 */

import { HostRuntime } from '../live/hostRuntime';
import { createErrorMarker, type TextmodeEditor } from '../editor/editors/TextmodeEditor';
import { AppState, type IAppState } from '../state/AppState';
import type { ErrorInfo } from '../types/app.types';

/**
 * Callbacks for textmode controller events.
 */
export interface TextmodeControllerCallbacks {
    /** Called when overlay needs re-rendering */
    onRenderOverlay: () => void;
    /** Called to save code to storage */
    onSaveCode: (code: string) => void;
}

/**
 * Dependencies required by TextmodeController.
 */
export interface TextmodeControllerDependencies {
    /** Application state store */
    appState: IAppState;
    /** Get editor instance (may be null during init) */
    getEditor: () => TextmodeEditor | null;
    /** Get runtime instance (may be null during init) */
    getRuntime: () => HostRuntime | null;
    /** Get current auto-execute setting */
    getAutoExecute: () => boolean;
    /** Get current auto-execute delay in ms */
    getAutoExecuteDelay: () => number;
}

/**
 * Textmode controller interface.
 */
export interface ITextmodeController {
    /** Handle code change (debounced execution) */
    handleCodeChange(code: string): void;
    /** Handle forced run (Ctrl+Enter) */
    handleForceRun(): void;
    /** Handle soft reset (Ctrl+Shift+R) */
    handleSoftReset(): void;
    /** Handle revert to last working code */
    handleRevertToLastWorking(): void;
    /** Handle runtime ready signal */
    handleRuntimeReady(): void;
    /** Handle successful code execution */
    handleRunOk(): void;
    /** Handle code execution error */
    handleRunError(error: ErrorInfo): void;
    /** Handle synth dynamic parameter error */
    handleSynthError(error: ErrorInfo): void;
}

/**
 * Textmode Controller implementation.
 */
export class TextmodeController implements ITextmodeController {
    private readonly callbacks: TextmodeControllerCallbacks;
    private readonly deps: TextmodeControllerDependencies;
    private debounceTimer: number | null = null;

    constructor(
        callbacks: TextmodeControllerCallbacks,
        deps: TextmodeControllerDependencies
    ) {
        this.callbacks = callbacks;
        this.deps = deps;
    }

    /**
     * Handle textmode code changes (debounced execution).
     */
    handleCodeChange(code: string): void {
        this.callbacks.onSaveCode(code);

        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        if (this.deps.getAutoExecute()) {
            this.debounceTimer = window.setTimeout(() => {
                this.deps.getRuntime()?.runCode(code);
                this.debounceTimer = null;
            }, this.deps.getAutoExecuteDelay());
        }
    }

    /**
     * Handle forced textmode run (Ctrl+Enter).
     */
    handleForceRun(): void {
        const editor = this.deps.getEditor();
        const code = editor?.getValue() ?? '';
        this.callbacks.onSaveCode(code);
        this.deps.appState.setError(null);
        editor?.clearMarkers();
        this.deps.getRuntime()?.forceRun(code);
        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle soft reset (Ctrl+Shift+R).
     */
    handleSoftReset(): void {
        const editor = this.deps.getEditor();
        const code = editor?.getValue() ?? '';
        this.callbacks.onSaveCode(code);
        this.deps.appState.setError(null);
        this.deps.appState.setStatus('ready');
        editor?.clearMarkers();
        this.deps.getRuntime()?.softReset(code);
        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle revert to last working code.
     */
    handleRevertToLastWorking(): void {
        const lastWorkingCode = this.deps.appState.getLastWorkingCode();
        if (!lastWorkingCode) return;

        const editor = this.deps.getEditor();
        editor?.setValue(lastWorkingCode);
        this.callbacks.onSaveCode(lastWorkingCode);
        this.deps.appState.setError(null);
        editor?.clearMarkers();
        this.deps.getRuntime()?.forceRun(lastWorkingCode);
        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle runtime ready signal.
     */
    handleRuntimeReady(): void {
        this.deps.appState.setStatus('ready');
        this.callbacks.onRenderOverlay();

        // Auto-run initial code
        const editor = this.deps.getEditor();
        const code = editor?.getValue() ?? '';
        if (code) {
            this.deps.getRuntime()?.runCode(code);
        }
    }

    /**
     * Handle successful code execution.
     */
    handleRunOk(): void {
        const editor = this.deps.getEditor();
        const code = editor?.getValue() ?? '';

        // Start pending working code confirmation
        (this.deps.appState as AppState)?.setPendingWorkingCode(code);

        this.deps.appState.setStatus('running');
        this.deps.appState.setError(null);
        editor?.clearMarkers();
        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle code execution error.
     */
    handleRunError(error: ErrorInfo): void {
        this.deps.appState.setStatus('error');
        this.deps.appState.setError(error);

        const editor = this.deps.getEditor();
        if (editor) {
            const marker = createErrorMarker(error.message, error.line, error.column);
            editor.setMarkers([marker]);
        }

        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle synth dynamic parameter error.
     */
    handleSynthError(error: ErrorInfo): void {
        // Cancel pending working code confirmation
        (this.deps.appState as AppState)?.cancelPendingWorkingCode();

        this.deps.appState.setStatus('error');
        this.deps.appState.setError(error);

        this.callbacks.onRenderOverlay();
    }
}
