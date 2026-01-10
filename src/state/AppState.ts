/**
 * Application State Store - centralized state management.
 * Provides a single source of truth for application state with subscription support.
 */

import { DEFAULT_SETTINGS, type StatusState, type AppSettings, type ErrorInfo, type StrudelState } from '@/types/app.types';

/**
 * Complete application state.
 */
export interface AppStateData {
    /** Current status indicator state */
    status: StatusState;
    /** Current error info if any */
    error: ErrorInfo | null;
    /** User settings */
    settings: AppSettings;
    /** Last known working textmode code (for revert) */
    lastWorkingTextmodeCode: string | null;
    /** Last known working strudel code (for revert) */
    lastWorkingStrudelCode: string | null;
    /** Audio playback state */
    strudelState: StrudelState;
}

/**
 * State change listener type.
 */
export type StateListener = (state: AppStateData) => void;

/**
 * Application state store interface.
 */
export interface IAppState {
    /** Get current state snapshot */
    getState(): Readonly<AppStateData>;
    /** Get current status */
    getStatus(): StatusState;
    /** Set status */
    setStatus(status: StatusState): void;
    /** Get current error */
    getError(): ErrorInfo | null;
    /** Set error */
    setError(error: ErrorInfo | null): void;
    /** Get settings */
    getSettings(): AppSettings;
    /** Update settings */
    setSettings(settings: AppSettings): void;
    /** Get last working textmode code */
    getLastWorkingCode(): string | null;
    /** Set last working textmode code */
    setLastWorkingCode(code: string | null): void;
    /** Get last working strudel code */
    getLastWorkingStrudelCode(): string | null;
    /** Set last working strudel code */
    setLastWorkingStrudelCode(code: string | null): void;
    /** Get audio state */
    getStrudelState(): StrudelState;
    /** Update audio state */
    setStrudelState(state: Partial<StrudelState>): void;
    /** Subscribe to state changes */
    subscribe(listener: StateListener): () => void;
}

/**
 * Application State Store implementation.
 */
export class AppState implements IAppState {
    private state: AppStateData;
    private listeners: Set<StateListener> = new Set();

    // Working code confirmation (internal mechanics)
    private pendingWorkingCode: string | null = null;
    private confirmationTimer: number | null = null;
    private pendingStrudelWorkingCode: string | null = null;
    private strudelConfirmationTimer: number | null = null;
    private static readonly CONFIRMATION_DELAY_MS = 100;

    constructor(initialSettings?: AppSettings) {
        this.state = {
            status: 'ready',
            error: null,
            settings: initialSettings ?? DEFAULT_SETTINGS,
            lastWorkingTextmodeCode: null,
            lastWorkingStrudelCode: null,
            strudelState: {
                isPlaying: false,
                isInitialized: false,
            },
        };
    }

    /**
     * Get current state snapshot.
     */
    getState(): Readonly<AppStateData> {
        return { ...this.state };
    }

    /**
     * Get current status.
     */
    getStatus(): StatusState {
        return this.state.status;
    }

    /**
     * Set status.
     */
    setStatus(status: StatusState): void {
        if (this.state.status !== status) {
            this.state.status = status;
            this.notify();
        }
    }

    /**
     * Get current error.
     */
    getError(): ErrorInfo | null {
        return this.state.error;
    }

    /**
     * Set error.
     */
    setError(error: ErrorInfo | null): void {
        this.state.error = error;
        this.notify();
    }

    /**
     * Get settings.
     */
    getSettings(): AppSettings {
        return this.state.settings;
    }

    /**
     * Update settings.
     */
    setSettings(settings: AppSettings): void {
        this.state.settings = settings;
        this.notify();
    }

    /**
     * Get last working code.
     */
    getLastWorkingCode(): string | null {
        return this.state.lastWorkingTextmodeCode;
    }

    /**
     * Set last working code.
     */
    setLastWorkingCode(code: string | null): void {
        this.state.lastWorkingTextmodeCode = code;
        this.notify();
    }

    /**
     * Get last working strudel code.
     */
    getLastWorkingStrudelCode(): string | null {
        return this.state.lastWorkingStrudelCode;
    }

    /**
     * Set last working strudel code.
     */
    setLastWorkingStrudelCode(code: string | null): void {
        this.state.lastWorkingStrudelCode = code;
        this.notify();
    }

    /**
     * Get audio state.
     */
    getStrudelState(): StrudelState {
        return this.state.strudelState;
    }

    /**
     * Update audio state (partial update supported).
     */
    setStrudelState(state: Partial<StrudelState>): void {
        this.state.strudelState = { ...this.state.strudelState, ...state };
        this.notify();
    }

    /**
     * Subscribe to state changes.
     * @returns Unsubscribe function
     */
    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // ==================== Working Code Confirmation ====================

    /**
     * Start pending working code confirmation.
     * If no error occurs within CONFIRMATION_DELAY_MS, code becomes lastWorkingCode.
     */
    setPendingWorkingCode(code: string): void {
        // Clear any existing timer
        if (this.confirmationTimer !== null) {
            clearTimeout(this.confirmationTimer);
        }

        this.pendingWorkingCode = code;

        // Set confirmation timer
        this.confirmationTimer = window.setTimeout(() => {
            if (this.pendingWorkingCode) {
                this.state.lastWorkingTextmodeCode = this.pendingWorkingCode;
                this.pendingWorkingCode = null;
                this.notify();
            }
            this.confirmationTimer = null;
        }, AppState.CONFIRMATION_DELAY_MS);
    }

    /**
     * Cancel pending working code (called on error).
     */
    cancelPendingWorkingCode(): void {
        if (this.confirmationTimer !== null) {
            clearTimeout(this.confirmationTimer);
            this.confirmationTimer = null;
        }
        this.pendingWorkingCode = null;
    }

    /**
     * Check if there is pending working code.
     */
    hasPendingWorkingCode(): boolean {
        return this.pendingWorkingCode !== null;
    }

    // ==================== Strudel Working Code Confirmation ====================

    /**
     * Start pending strudel working code confirmation.
     * If no error occurs within CONFIRMATION_DELAY_MS, code becomes lastWorkingStrudelCode.
     */
    setPendingStrudelWorkingCode(code: string): void {
        // Clear any existing timer
        if (this.strudelConfirmationTimer !== null) {
            clearTimeout(this.strudelConfirmationTimer);
        }

        this.pendingStrudelWorkingCode = code;

        // Set confirmation timer
        this.strudelConfirmationTimer = window.setTimeout(() => {
            if (this.pendingStrudelWorkingCode) {
                this.state.lastWorkingStrudelCode = this.pendingStrudelWorkingCode;
                this.pendingStrudelWorkingCode = null;
                this.notify();
            }
            this.strudelConfirmationTimer = null;
        }, AppState.CONFIRMATION_DELAY_MS);
    }

    /**
     * Cancel pending strudel working code (called on error).
     */
    cancelPendingStrudelWorkingCode(): void {
        if (this.strudelConfirmationTimer !== null) {
            clearTimeout(this.strudelConfirmationTimer);
            this.strudelConfirmationTimer = null;
        }
        this.pendingStrudelWorkingCode = null;
    }

    // ==================== Private Methods ====================

    /**
     * Notify all listeners of state change.
     */
    private notify(): void {
        const snapshot = this.getState();
        this.listeners.forEach(listener => listener(snapshot));
    }
}

/**
 * Create a new AppState instance.
 */
export function createAppState(initialSettings?: AppSettings): IAppState {
    return new AppState(initialSettings);
}
