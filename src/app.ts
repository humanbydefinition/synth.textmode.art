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
    fontSize: 16,
    uiVisible: true,
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
    private lastWorkingCode: string | null = null;

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

        // Setup mobile touch handling for pinch-to-zoom
        this.setupMobileTouchHandling();

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
            onSoftReset: () => this.handleSoftReset(),
            onToggleUI: () => this.toggleUIVisibility(),
            onToggleTextBackground: () => this.handleSettingsChange({ ...this.settings, glassEffect: !this.settings.glassEffect }),
            onToggleAutoExecute: () => this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute }),
            onIncreaseFontSize: () => this.handleFontSizeChange(1),
            onDecreaseFontSize: () => this.handleFontSizeChange(-1),
            fontSize: this.settings.fontSize,
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

        // Setup shortcuts
        this.setupGlobalShortcuts();
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
                hasLastWorking: this.lastWorkingCode !== null,
                onSettingsChange: (settings) => this.handleSettingsChange(settings),
                onShare: () => this.handleShare(),
                onClearStorage: () => this.handleClearStorage(),
                onLoadExample: (code) => this.handleLoadExample(code),
                onDismissError: () => this.handleDismissError(),
                onRevertToLastWorking: () => this.handleRevertToLastWorking(),
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
     * Handle soft reset (Ctrl+Shift+R) - resets frameCount to 0 and re-runs code
     */
    private handleSoftReset(): void {
        const code = this.editor?.getValue() ?? '';
        this.saveCode(code);
        this.error = null;
        this.status = 'ready';
        this.editor?.clearMarkers();
        this.runtime?.softReset(code);
        this.renderOverlay();
    }

    /**
     * Handle revert to last working code
     */
    private handleRevertToLastWorking(): void {
        if (!this.lastWorkingCode) return;

        this.editor?.setValue(this.lastWorkingCode);
        this.saveCode(this.lastWorkingCode);
        this.error = null;
        this.editor?.clearMarkers();
        this.runtime?.forceRun(this.lastWorkingCode);
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

        // Apply font size
        if (this.editor) {
            this.editor.updateOptions({ fontSize: settings.fontSize });
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
        this.lastWorkingCode = null;
        this.editor?.setValue(exampleSketch);
        this.handleSoftReset();
    }

    /**
     * Handle loading an example sketch
     */
    private handleLoadExample(code: string): void {
        this.editor?.setValue(code);
        this.saveCode(code);
        this.error = null;
        this.editor?.clearMarkers();
        this.runtime?.forceRun(code);
        this.renderOverlay();
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

        // Auto-run initial code to ensure visual feedback and backup state
        const code = this.editor?.getValue() ?? '';
        if (code) {
            this.runtime?.runCode(code);
        }
    }

    /**
     * Handle successful code execution
     */
    private handleRunOk(): void {
        // Store the current code as last working
        const code = this.editor?.getValue() ?? '';
        this.lastWorkingCode = code;

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

    /**
     * Setup keyboard shortcuts
     */
    private setupGlobalShortcuts(): void {
        window.addEventListener('keydown', (e) => {
            // Font size shortcuts: Ctrl + +/-
            if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === '-')) {
                e.preventDefault();
                const currentSize = this.settings.fontSize;
                let newSize = currentSize;

                if (e.key === '+' || e.key === '=') {
                    newSize = Math.min(32, currentSize + 1);
                } else {
                    newSize = Math.max(10, currentSize - 1);
                }

                if (newSize !== currentSize) {
                    this.handleSettingsChange({ ...this.settings, fontSize: newSize });
                }
            }

            // Toggle auto-execute: Ctrl + E
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute });
            }

            // Toggle text background: Ctrl + B
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.handleSettingsChange({ ...this.settings, glassEffect: !this.settings.glassEffect });
            }

            // Toggle UI visibility: Ctrl + Shift + H
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                this.toggleUIVisibility();
            }
        });
    }

    /**
     * Toggle UI visibility (editor, overlay, status indicator)
     */
    private toggleUIVisibility(): void {
        const newVisibility = !this.settings.uiVisible;
        this.settings = { ...this.settings, uiVisible: newVisibility };
        // Don't save uiVisible to storage - it's a session-only setting

        // Toggle editor visibility
        if (this.editorContainer) {
            this.editorContainer.style.display = newVisibility ? '' : 'none';
        }

        // Toggle overlay visibility
        const overlayRoot = document.getElementById('overlay-root');
        if (overlayRoot) {
            overlayRoot.style.display = newVisibility ? '' : 'none';
        }
    }

    /**
     * Handle font size change by delta
     */
    private handleFontSizeChange(delta: number): void {
        const currentSize = this.settings.fontSize;
        const newSize = Math.min(32, Math.max(10, currentSize + delta));
        if (newSize !== currentSize) {
            this.handleSettingsChange({ ...this.settings, fontSize: newSize });
        }
    }

    /**
     * Setup mobile touch handling to enable pinch-to-zoom
     * Monaco captures touch events, so we need to intercept multi-touch
     * and let the browser handle them for native zooming
     */
    private setupMobileTouchHandling(): void {
        if (!this.editorContainer) return;

        // Track active touches
        let touchCount = 0;

        // When multi-touch starts, disable pointer-events on editor
        // so browser can handle the native pinch-zoom gesture
        this.editorContainer.addEventListener('touchstart', (e) => {
            touchCount = e.touches.length;
            if (touchCount >= 2) {
                // Multi-touch detected - let browser handle it
                this.editorContainer!.style.pointerEvents = 'none';
            }
        }, { passive: true });

        this.editorContainer.addEventListener('touchend', () => {
            touchCount = 0;
            // Re-enable pointer events after gesture ends
            if (this.editorContainer) {
                this.editorContainer.style.pointerEvents = 'auto';
            }
        }, { passive: true });

        this.editorContainer.addEventListener('touchcancel', () => {
            touchCount = 0;
            if (this.editorContainer) {
                this.editorContainer.style.pointerEvents = 'auto';
            }
        }, { passive: true });

        // Reset viewport zoom on page load (iOS Safari preserves zoom state)
        // Use a small delay to ensure it runs after any auto-zoom from input focus
        window.addEventListener('load', () => {
            setTimeout(() => {
                // Force viewport reset by briefly modifying and restoring the meta tag
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    const content = viewport.getAttribute('content') || '';
                    viewport.setAttribute('content', content + ', initial-scale=1');
                    setTimeout(() => {
                        viewport.setAttribute('content', content);
                    }, 10);
                }
            }, 100);
        });
    }
}
