/**
 * Main application - orchestrates Monaco editor, iframe runtime, and UI
 */
import { createMonacoEditor, createErrorMarker, type MonacoEditorInstance } from './editor/monaco';
import { HostRuntime } from './live/hostRuntime';
import { exampleSketch } from './live/exampleSketch';
import { getCodeFromHash, setCodeToHash, getShareableUrl } from './live/share';
import {
    createOverlayElements,
    ErrorOverlayController,
    StatusController,
    ControlsController,
} from './ui/overlay';

const STORAGE_KEY = 'textmode_live_code';

export class App {
    private editor: MonacoEditorInstance | null = null;
    private runtime: HostRuntime | null = null;
    private errorOverlay: ErrorOverlayController | null = null;
    private status: StatusController | null = null;
    private controls: ControlsController | null = null;

    /**
     * Initialize the application
     */
    init(): void {
        // Create DOM elements
        const editorContainer = document.createElement('div');
        editorContainer.id = 'editor-container';
        document.body.appendChild(editorContainer);

        // Create UI overlays
        const { errorOverlay, controls, status } = createOverlayElements();

        this.errorOverlay = new ErrorOverlayController(errorOverlay);
        this.status = new StatusController(status);
        this.controls = new ControlsController(controls);

        // Load initial code (priority: URL hash > localStorage > example)
        const initialCode = this.loadCode();

        // Create Monaco editor
        this.editor = createMonacoEditor({
            container: editorContainer,
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

        // Wire up controls
        this.controls.setCallbacks(
            () => this.handleForceRun(),
            () => this.handleHardReload(),
            () => this.handleShare()
        );

        this.errorOverlay.setCallbacks(
            () => this.editor?.clearMarkers(),
            () => this.handleHardReload()
        );

        // Initialize runtime
        this.runtime.init();
    }

    /**
     * Load code from URL hash, localStorage, or use example
     */
    private loadCode(): string {
        // Try URL hash first
        const hashCode = getCodeFromHash();
        if (hashCode) {
            return hashCode;
        }

        // Try localStorage
        const storedCode = localStorage.getItem(STORAGE_KEY);
        if (storedCode) {
            return storedCode;
        }

        // Use example
        return exampleSketch;
    }

    /**
     * Save code to localStorage
     */
    private saveCode(code: string): void {
        localStorage.setItem(STORAGE_KEY, code);
    }

    /**
     * Handle code changes (debounced execution)
     */
    private handleCodeChange(code: string): void {
        this.saveCode(code);
        this.runtime?.runCode(code);
    }

    /**
     * Handle forced run (Ctrl+Enter)
     */
    private handleForceRun(): void {
        const code = this.editor?.getValue() ?? '';
        this.saveCode(code);
        this.errorOverlay?.hide();
        this.editor?.clearMarkers();
        this.runtime?.forceRun(code);
    }

    /**
     * Handle hard reload (Ctrl+Shift+R)
     */
    private handleHardReload(): void {
        const code = this.editor?.getValue() ?? '';
        this.saveCode(code);
        this.errorOverlay?.hide();
        this.editor?.clearMarkers();
        this.status?.setReady();
        this.runtime?.hardReload(code);
    }

    /**
     * Handle share button
     */
    private handleShare(): void {
        const code = this.editor?.getValue() ?? '';
        const url = getShareableUrl(code);

        // Update URL
        setCodeToHash(code);

        // Copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            // Show brief feedback
            const btn = document.querySelector('#btn-share');
            if (btn) {
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 1500);
            }
        }).catch(() => {
            // Fallback: just update URL
            console.log('Share URL:', url);
        });
    }

    /**
     * Handle runtime ready signal
     */
    private handleRuntimeReady(): void {
        this.status?.setReady();
        // Initial code will be sent by pendingCode mechanism in HostRuntime
    }

    /**
     * Handle successful code execution
     */
    private handleRunOk(): void {
        this.status?.setUpdated();
        this.errorOverlay?.hide();
        this.editor?.clearMarkers();
    }

    /**
     * Handle code execution error
     */
    private handleRunError(error: { message: string; stack?: string; line?: number; column?: number }): void {
        this.status?.setError();
        this.errorOverlay?.show(error);

        // Set Monaco markers
        if (this.editor) {
            const marker = createErrorMarker(error.message, error.line, error.column);
            this.editor.setMarkers([marker]);
        }
    }
}
