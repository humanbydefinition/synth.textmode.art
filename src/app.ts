/**
 * Main application - orchestrates Monaco editor, iframe runtime, React UI, and state
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { createMonacoEditor, createErrorMarker, type MonacoEditorInstance } from './editor/monaco';
import { HostRuntime } from './live/hostRuntime';
import { exampleSketch } from './live/exampleSketch';
import { getCodeFromHash, setCodeToHash, getShareableUrl } from './live/share';
import { Overlay, type StatusState, type AppSettings, type ErrorInfo } from './components/Overlay';

const CODE_STORAGE_KEY = 'textmode_live_code';
const SETTINGS_STORAGE_KEY = 'textmode_live_settings';

const DEFAULT_SETTINGS: AppSettings = {
    autoExecute: true,
    glassEffect: true,
};

export class App {
    private editor: MonacoEditorInstance | null = null;
    private runtime: HostRuntime | null = null;
    private editorContainer: HTMLElement | null = null;
    private overlayRoot: Root | null = null;

    // State
    private status: StatusState = 'ready';
    private error: ErrorInfo | null = null;
    private settings: AppSettings = DEFAULT_SETTINGS;

    /**
     * Initialize the application
     */
    init(): void {
        // Load settings
        this.settings = this.loadSettings();

        // Create editor container
        this.editorContainer = document.createElement('div');
        this.editorContainer.id = 'editor-container';
        if (this.settings.glassEffect) {
            this.editorContainer.classList.add('glass-effect');
        }
        document.body.appendChild(this.editorContainer);

        // Create React overlay root
        const overlayRootEl = document.createElement('div');
        overlayRootEl.id = 'overlay-root';
        document.body.appendChild(overlayRootEl);
        this.overlayRoot = createRoot(overlayRootEl);

        // Load initial code
        const initialCode = this.loadCode();

        // Create Monaco editor
        this.editor = createMonacoEditor({
            container: this.editorContainer,
            initialValue: initialCode,
            onChange: (value) => this.handleCodeChange(value),
            onRun: () => this.handleForceRun(),
            onHardReload: () => this.handleHardReload(),
        });

        // Create iframe runtime
        this.runtime = new HostRuntime({
            container: document.body,
            onReady: () => this.handleRuntimeReady(),
            onRunOk: () => this.handleRunOk(),
            onRunError: (error) => this.handleRunError(error),
        });

        // Initial render of React overlay
        this.renderOverlay();

        // Initialize runtime
        this.runtime.init();
    }

    /**
     * Render React overlay
     */
    private renderOverlay(): void {
        if (!this.overlayRoot) return;

        this.overlayRoot.render(
            createElement(Overlay, {
                status: this.status,
                settings: this.settings,
                error: this.error,
                onSettingsChange: (settings) => this.handleSettingsChange(settings),
                onShare: () => this.handleShare(),
                onClearStorage: () => this.handleClearStorage(),
                onDismissError: () => this.handleDismissError(),
                onHardReset: () => this.handleHardReload(),
            })
        );
    }

    /**
     * Load code from URL hash, localStorage, or use example
     */
    private loadCode(): string {
        const hashCode = getCodeFromHash();
        if (hashCode) return hashCode;

        const storedCode = localStorage.getItem(CODE_STORAGE_KEY);
        if (storedCode) return storedCode;

        return exampleSketch;
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): AppSettings {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch {
            // Ignore parse errors
        }
        return DEFAULT_SETTINGS;
    }

    /**
     * Save code to localStorage
     */
    private saveCode(code: string): void {
        localStorage.setItem(CODE_STORAGE_KEY, code);
    }

    /**
     * Save settings to localStorage
     */
    private saveSettings(settings: AppSettings): void {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }

    /**
     * Handle code changes (debounced execution)
     */
    private handleCodeChange(code: string): void {
        this.saveCode(code);
        if (this.settings.autoExecute) {
            this.runtime?.runCode(code);
        }
    }

    /**
     * Handle forced run (Ctrl+Enter)
     */
    private handleForceRun(): void {
        const code = this.editor?.getValue() ?? '';
        this.saveCode(code);
        this.error = null;
        this.editor?.clearMarkers();
        this.runtime?.forceRun(code);
        this.renderOverlay();
    }

    /**
     * Handle hard reload (Ctrl+Shift+R)
     */
    private handleHardReload(): void {
        const code = this.editor?.getValue() ?? '';
        this.saveCode(code);
        this.error = null;
        this.status = 'ready';
        this.editor?.clearMarkers();
        this.runtime?.hardReload(code);
        this.renderOverlay();
    }

    /**
     * Handle settings change
     */
    private handleSettingsChange(settings: AppSettings): void {
        this.settings = settings;
        this.saveSettings(settings);

        // Toggle glass effect
        if (this.editorContainer) {
            if (settings.glassEffect) {
                this.editorContainer.classList.add('glass-effect');
            } else {
                this.editorContainer.classList.remove('glass-effect');
            }
        }

        this.renderOverlay();
    }

    /**
     * Handle share button
     */
    private handleShare(): void {
        const code = this.editor?.getValue() ?? '';
        const url = getShareableUrl(code);
        setCodeToHash(code);
        navigator.clipboard.writeText(url).catch(() => {
            console.log('Share URL:', url);
        });
    }

    /**
     * Handle clear storage
     */
    private handleClearStorage(): void {
        localStorage.removeItem(CODE_STORAGE_KEY);
        this.editor?.setValue(exampleSketch);
        this.handleHardReload();
    }

    /**
     * Handle dismiss error
     */
    private handleDismissError(): void {
        this.error = null;
        this.editor?.clearMarkers();
        this.renderOverlay();
    }

    /**
     * Handle runtime ready signal
     */
    private handleRuntimeReady(): void {
        this.status = 'ready';
        this.renderOverlay();
    }

    /**
     * Handle successful code execution
     */
    private handleRunOk(): void {
        this.status = 'running';
        this.error = null;
        this.editor?.clearMarkers();
        this.renderOverlay();
    }

    /**
     * Handle code execution error
     */
    private handleRunError(error: ErrorInfo): void {
        this.status = 'error';
        this.error = error;

        if (this.editor) {
            const marker = createErrorMarker(error.message, error.line, error.column);
            this.editor.setMarkers([marker]);
        }

        this.renderOverlay();
    }
}
