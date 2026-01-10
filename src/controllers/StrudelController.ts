/**
 * Audio Controller - centralized Strudel/audio-specific logic.
 * Handles audio initialization, code execution, pattern updates, and play state.
 */

import { StrudelRuntime, type StrudelPattern } from '../live/strudel';
import { createStrudelErrorMarker, type StrudelEditor } from '../editor/editors/StrudelEditor';
import { AppState, type IAppState } from '../state/AppState';
import type { ErrorInfo } from '../types/app.types';

/**
 * Strudel error type from runtime.
 */
export interface StrudelError {
    message: string;
    stack?: string;
    line?: number;
    column?: number;
}

/**
 * Callbacks for audio controller events.
 */
export interface StrudelControllerCallbacks {
    /** Called when overlay needs re-rendering */
    onRenderOverlay: () => void;
    /** Called to save code to storage */
    onSaveCode: (code: string) => void;
}

/**
 * Dependencies required by StrudelController.
 */
export interface StrudelControllerDependencies {
    /** Application state store */
    appState: IAppState;
    /** Get editor instance (may be null during init) */
    getEditor: () => StrudelEditor | null;
    /** Get runtime instance (may be null during init) */
    getRuntime: () => StrudelRuntime | null;
    /** Get current auto-execute setting */
    getAutoExecute: () => boolean;
    /** Get current auto-execute delay in ms */
    getAutoExecuteDelay: () => number;
}

/**
 * Audio controller interface.
 */
export interface IStrudelController {
    /** Handle code change (debounced execution) */
    handleCodeChange(code: string): void;
    /** Handle forced run (Ctrl+Enter) */
    handleForceRun(): void;
    /** Handle hush (stop audio) */
    handleHush(): void;
    /** Initialize audio (must be triggered by user interaction) */
    handleInitAudio(): Promise<void>;
    /** Setup automatic audio initialization on first user interaction */
    setupAutoAudioInit(): void;
    /** Handle runtime ready signal */
    handleStrudelReady(): void;
    /** Handle runtime error */
    handleStrudelError(error: StrudelError): void;
    /** Handle pattern update */
    handlePatternUpdate(pattern: StrudelPattern | null): void;
    /** Handle play state change */
    handlePlayStateChange(isPlaying: boolean): void;
    /** Dispose listeners */
    dispose(): void;
}

/**
 * Audio Controller implementation.
 */
export class StrudelController implements IStrudelController {
    private readonly callbacks: StrudelControllerCallbacks;
    private readonly deps: StrudelControllerDependencies;
    private autoInitListener: (() => void) | null = null;
    private debounceTimer: number | null = null;

    constructor(
        callbacks: StrudelControllerCallbacks,
        deps: StrudelControllerDependencies
    ) {
        this.callbacks = callbacks;
        this.deps = deps;
    }

    /**
     * Handle strudel code changes (debounced execution).
     */
    handleCodeChange(code: string): void {
        this.callbacks.onSaveCode(code);

        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        const audioState = this.deps.appState.getAudioState();
        if (this.deps.getAutoExecute() && audioState.isInitialized) {
            this.debounceTimer = window.setTimeout(() => {
                this.deps.getRuntime()?.evaluate(code);
                this.debounceTimer = null;
            }, this.deps.getAutoExecuteDelay());
        }
    }

    /**
     * Handle forced strudel run (Ctrl+Enter).
     */
    handleForceRun(): void {
        const editor = this.deps.getEditor();
        const code = editor?.getValue() ?? '';
        this.callbacks.onSaveCode(code);
        editor?.clearMarkers();

        // Initialize audio if needed, then run
        const audioState = this.deps.appState.getAudioState();
        if (!audioState.isInitialized) {
            this.handleInitAudio().then(() => {
                this.deps.getRuntime()?.forceEvaluate(code);
            });
        } else {
            this.deps.getRuntime()?.forceEvaluate(code);
        }
    }

    /**
     * Handle hush (stop audio).
     */
    handleHush(): void {
        this.deps.getRuntime()?.hush();
    }

    /**
     * Initialize audio (must be triggered by user interaction).
     */
    async handleInitAudio(): Promise<void> {
        const audioState = this.deps.appState.getAudioState();
        if (audioState.isInitialized) return;

        await this.deps.getRuntime()?.init();
    }

    /**
     * Setup automatic audio initialization on first user interaction.
     * This satisfies Web Audio autoplay policy without requiring explicit UI action.
     */
    setupAutoAudioInit(): void {
        const initOnInteraction = () => {
            const audioState = this.deps.appState.getAudioState();
            if (!audioState.isInitialized) {
                this.handleInitAudio();
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('keydown', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };

        this.autoInitListener = initOnInteraction;
        document.addEventListener('click', initOnInteraction);
        document.addEventListener('keydown', initOnInteraction);
        document.addEventListener('touchstart', initOnInteraction);
    }

    /**
     * Handle Strudel runtime ready.
     */
    handleStrudelReady(): void {
        (this.deps.appState as AppState)?.setAudioState({ isInitialized: true });
        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle Strudel error.
     */
    handleStrudelError(error: StrudelError): void {
        const errorInfo: ErrorInfo = {
            message: `[Strudel] ${error.message}`,
            stack: error.stack,
            line: error.line,
            column: error.column,
        };
        this.deps.appState.setError(errorInfo);

        const editor = this.deps.getEditor();
        if (editor && error.line) {
            const marker = createStrudelErrorMarker(error.message, error.line, error.column);
            editor.setMarkers([marker]);
        }

        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle Strudel pattern update.
     */
    handlePatternUpdate(pattern: StrudelPattern | null): void {
        const editor = this.deps.getEditor();
        const runtime = this.deps.getRuntime();

        // Pattern evaluated successfully, clear any errors
        editor?.clearMarkers();
        const currentError = this.deps.appState.getError();
        if (currentError?.message.startsWith('[Strudel]')) {
            this.deps.appState.setError(null);
        }

        // Update highlighting with the new pattern
        if (editor && runtime && pattern) {
            editor.setPattern(
                pattern,
                () => runtime.getTime(),
                () => runtime.getCycle()
            );
            editor.startHighlighting();
        }

        this.callbacks.onRenderOverlay();
    }

    /**
     * Handle Strudel play state change.
     */
    handlePlayStateChange(isPlaying: boolean): void {
        (this.deps.appState as AppState)?.setAudioState({ isPlaying });

        // Control highlighting based on play state
        if (!isPlaying) {
            this.deps.getEditor()?.stopHighlighting();
        }

        this.callbacks.onRenderOverlay();
    }

    /**
     * Dispose listeners.
     */
    dispose(): void {
        if (this.autoInitListener) {
            document.removeEventListener('click', this.autoInitListener);
            document.removeEventListener('keydown', this.autoInitListener);
            document.removeEventListener('touchstart', this.autoInitListener);
            this.autoInitListener = null;
        }
    }
}
