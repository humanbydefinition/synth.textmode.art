/**
 * Main application - orchestrates Monaco editor, iframe runtime, Strudel audio, React UI, and state
 * Split-screen layout with textmode.js visuals on left and Strudel audio on right
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import { type MonacoEditorInstance } from './editor/monaco';
import { type StrudelMonacoInstance } from './editor/strudelMonaco';
import { EditorFactory, type IEditorFactory } from './editor/EditorFactory';
import { HostRuntime } from './live/hostRuntime';
import { StrudelRuntime } from './live/strudel';
import { defaultSketch } from './live/defaultSketch';
import { defaultStrudelSketch } from './live/defaultStrudelSketch';
import { setCodesToHash, getCombinedShareableUrl } from './live/share';
import { Overlay } from './components/Overlay';
import { type MouseSonarHandle } from './components/MouseSonar';
import { DEFAULT_SETTINGS, type StatusState, type AppSettings, type ErrorInfo } from './types/app.types';
import { storageService, type IStorageService } from './services/StorageService';
import { LayoutManager, type ILayoutManager } from './layout/LayoutManager';
import { ShortcutsManager, type IShortcutsManager } from './shortcuts/ShortcutsManager';
import { AppState, type IAppState } from './state/AppState';
import { TextmodeController, type ITextmodeController } from './controllers/TextmodeController';
import { AudioController, type IAudioController } from './controllers/AudioController';
import { AudioAnalyser } from './live/AudioAnalyser';

export class App {
    // Services
    private storage: IStorageService = storageService;
    private editorFactory: IEditorFactory | null = null;
    private layout: ILayoutManager | null = null;
    private shortcuts: IShortcutsManager | null = null;
    private appState: IAppState | null = null;
    private textmodeController: ITextmodeController | null = null;
    private audioController: IAudioController | null = null;

    // Textmode (visuals)
    private textmodeEditor: MonacoEditorInstance | null = null;
    private textmodeRuntime: HostRuntime | null = null;
    private textmodePanel: HTMLElement | null = null;
    private textmodeEditorContainer: HTMLElement | null = null;

    // Strudel (audio)
    private strudelEditor: StrudelMonacoInstance | null = null;
    private strudelRuntime: StrudelRuntime | null = null;
    private strudelPanel: HTMLElement | null = null;
    private strudelEditorContainer: HTMLElement | null = null;

    // React overlay
    private overlayRoot: Root | null = null;
    private sonarRef = createRef<MouseSonarHandle>();

    // Audio analysis for audio-reactive visuals
    private audioAnalyser: AudioAnalyser | null = null;

    // Convenience accessors (delegate to appState)
    private get status(): StatusState {
        return this.appState?.getStatus() ?? 'ready';
    }
    private set status(value: StatusState) {
        this.appState?.setStatus(value);
    }
    private get error(): ErrorInfo | null {
        return this.appState?.getError() ?? null;
    }
    private set error(value: ErrorInfo | null) {
        this.appState?.setError(value);
    }
    private get settings(): AppSettings {
        return this.appState?.getSettings() ?? DEFAULT_SETTINGS;
    }
    private set settings(value: AppSettings) {
        this.appState?.setSettings(value);
    }
    private get lastWorkingCode(): string | null {
        return this.appState?.getLastWorkingCode() ?? null;
    }
    private set lastWorkingCode(value: string | null) {
        this.appState?.setLastWorkingCode(value);
    }

    /**
     * Initialize the application
     */
    init(): void {
        // Create state store with loaded settings
        const loadedSettings = this.storage.loadSettings();
        this.appState = new AppState(loadedSettings);

        // Get panel containers from HTML
        this.textmodePanel = document.getElementById('textmode-panel');
        this.strudelPanel = document.getElementById('strudel-panel');

        if (!this.textmodePanel || !this.strudelPanel) {
            console.error('Panel containers not found in DOM');
            return;
        }

        // Create textmode editor container (inside left panel)
        this.textmodeEditorContainer = document.createElement('div');
        this.textmodeEditorContainer.id = 'editor-container';
        if (this.settings.glassEffect) {
            this.textmodeEditorContainer.classList.add('glass-effect');
        }
        this.textmodePanel.appendChild(this.textmodeEditorContainer);

        // Create strudel editor container (inside right panel)
        this.strudelEditorContainer = document.createElement('div');
        this.strudelEditorContainer.id = 'strudel-editor-container';
        if (this.settings.glassEffect) {
            this.strudelEditorContainer.classList.add('glass-effect');
        }
        this.strudelPanel.appendChild(this.strudelEditorContainer);

        // Create layout manager for split-pane and mobile layout
        this.layout = new LayoutManager({
            containerId: 'app-container',
            textmodePanel: this.textmodePanel,
            strudelPanel: this.strudelPanel,
            textmodeEditorContainer: this.textmodeEditorContainer,
            strudelEditorContainer: this.strudelEditorContainer,
            onPanelChange: (panel) => this.handlePanelChange(panel),
            onLayoutChange: () => this.renderOverlay(),
        });
        this.layout.init();

        // Create React overlay root
        const overlayRootEl = document.createElement('div');
        overlayRootEl.id = 'overlay-root';
        document.body.appendChild(overlayRootEl);
        this.overlayRoot = createRoot(overlayRootEl);

        // Load initial code
        const textmodeCode = this.loadTextmodeCode();
        const strudelCode = this.loadStrudelCode();

        // Create editor factory with current font size and line numbers
        this.editorFactory = new EditorFactory({
            fontSize: this.settings.fontSize,
            lineNumbers: this.settings.lineNumbers
        });

        // Create textmode Monaco editor
        this.textmodeEditor = this.editorFactory.createTextmodeEditor(
            this.textmodeEditorContainer,
            textmodeCode,
            {
                onChange: (value) => this.textmodeController?.handleCodeChange(value),
                onRun: () => this.textmodeController?.handleForceRun(),
                onSoftReset: () => this.textmodeController?.handleSoftReset(),
                onToggleUI: () => this.toggleUIVisibility(),
                onToggleTextBackground: () => this.handleSettingsChange({ ...this.settings, glassEffect: !this.settings.glassEffect }),
                onToggleAutoExecute: () => this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute }),
                onIncreaseFontSize: () => this.handleFontSizeChange(1),
                onDecreaseFontSize: () => this.handleFontSizeChange(-1),
            }
        );

        // Create Strudel Monaco editor
        this.strudelEditor = this.editorFactory.createStrudelEditor(
            this.strudelEditorContainer,
            strudelCode,
            {
                onChange: (value) => this.audioController?.handleCodeChange(value),
                onRun: () => this.audioController?.handleForceRun(),
                onHush: () => this.audioController?.handleHush(),
                onToggleUI: () => this.toggleUIVisibility(),
                onIncreaseFontSize: () => this.handleFontSizeChange(1),
                onDecreaseFontSize: () => this.handleFontSizeChange(-1),
            }
        );

        // Create textmode controller
        this.textmodeController = new TextmodeController(
            {
                onRenderOverlay: () => this.renderOverlay(),
                onSaveCode: (code) => this.saveTextmodeCode(code),
            },
            {
                appState: this.appState!,
                getEditor: () => this.textmodeEditor,
                getRuntime: () => this.textmodeRuntime,
                getAutoExecute: () => this.settings.autoExecute,
                getAutoExecuteDelay: () => this.settings.autoExecuteDelay,
            }
        );

        // Create audio controller
        this.audioController = new AudioController(
            {
                onRenderOverlay: () => this.renderOverlay(),
                onSaveCode: (code) => this.saveStrudelCode(code),
            },
            {
                appState: this.appState!,
                getEditor: () => this.strudelEditor,
                getRuntime: () => this.strudelRuntime,
                getAutoExecute: () => this.settings.autoExecute,
                getAutoExecuteDelay: () => this.settings.autoExecuteDelay,
            }
        );

        // Create iframe runtime for textmode (fullscreen canvas in background)
        this.textmodeRuntime = new HostRuntime({
            container: document.body,
            onReady: () => this.textmodeController!.handleRuntimeReady(),
            onRunOk: () => this.textmodeController!.handleRunOk(),
            onRunError: (error) => this.textmodeController!.handleRunError(error),
            onSynthError: (error) => this.textmodeController!.handleSynthError(error),
        });

        // Create Strudel runtime (audio engine)
        this.strudelRuntime = new StrudelRuntime({
            onReady: () => this.audioController!.handleStrudelReady(),
            onError: (error) => this.audioController!.handleStrudelError(error),
            onPatternUpdate: (pattern) => this.audioController!.handlePatternUpdate(pattern),
            onPlayStateChange: (isPlaying) => this.audioController!.handlePlayStateChange(isPlaying),
        });

        // Initial render of React overlay
        this.renderOverlay();

        // Initialize textmode runtime
        this.textmodeRuntime.init();

        // Create shortcuts manager
        this.shortcuts = new ShortcutsManager({
            actions: {
                triggerSonarPing: () => this.sonarRef.current?.ping(),
                changeFontSize: (delta) => this.handleFontSizeChange(delta),
                toggleAutoExecute: () => this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute }),
                toggleGlassEffect: () => this.handleSettingsChange({ ...this.settings, glassEffect: !this.settings.glassEffect }),
                toggleUIVisibility: () => this.toggleUIVisibility(),
                hushAudio: () => this.audioController?.handleHush(),
            },
        });
        this.shortcuts.init();

        // Create audio analyser for audio-reactive visuals
        // Polls Strudel's AnalyserNode and sends data to iframe at 60fps
        this.audioAnalyser = new AudioAnalyser({
            onData: (data) => {
                this.textmodeRuntime?.sendAudioData(data);
            },
        });
        this.audioAnalyser.start();

        // Auto-initialize audio on first user interaction
        this.audioController.setupAutoAudioInit();
    }

    /**
     * Handle panel change from layout manager (for editor focus)
     */
    private handlePanelChange(panel: 'textmode' | 'strudel'): void {
        // Only auto-focus on desktop to avoid triggering keyboard on mobile
        if (!this.layout?.isMobile) {
            if (panel === 'textmode') {
                this.textmodeEditor?.editor.focus();
            } else {
                this.strudelEditor?.focus();
            }
        }
        this.renderOverlay();
    }

    /**
     * Handle mobile panel selection (delegates to layout manager)
     */
    private handleSelectPanel(panel: 'textmode' | 'strudel'): void {
        this.layout?.setActivePanel(panel);
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
                onRevertToLastWorking: () => this.textmodeController?.handleRevertToLastWorking(),
                sonarRef: this.sonarRef,
                // Mobile props
                isMobile: this.layout?.isMobile ?? false,
                activePanel: this.layout?.activePanel ?? 'textmode',
                onSelectPanel: (panel) => this.handleSelectPanel(panel),
            })
        );
    }

    // ==================== Code Loading ====================

    /**
     * Load textmode code from URL hash, localStorage, or use default
     */
    private loadTextmodeCode(): string {
        return this.storage.loadTextmodeCode();
    }

    /**
     * Load strudel code from localStorage or use default
     */
    private loadStrudelCode(): string {
        return this.storage.loadStrudelCode();
    }

    /**
     * Save textmode code to localStorage
     */
    private saveTextmodeCode(code: string): void {
        this.storage.saveTextmodeCode(code);
    }

    /**
     * Save strudel code to localStorage
     */
    private saveStrudelCode(code: string): void {
        this.storage.saveStrudelCode(code);
    }

    /**
     * Save settings to localStorage
     */
    private saveSettings(settings: AppSettings): void {
        this.storage.saveSettings(settings);
    }

    // ==================== Common Handlers ====================

    /**
     * Handle settings change
     */
    private handleSettingsChange(settings: AppSettings): void {
        this.settings = settings;
        this.saveSettings(settings);

        // Update editor factory for future editors
        if (this.editorFactory) {
            this.editorFactory.setLineNumbers(settings.lineNumbers);
        }

        // Toggle glass effect on both editors
        if (this.textmodeEditorContainer) {
            if (settings.glassEffect) {
                this.textmodeEditorContainer.classList.add('glass-effect');
            } else {
                this.textmodeEditorContainer.classList.remove('glass-effect');
            }
        }
        if (this.strudelEditorContainer) {
            if (settings.glassEffect) {
                this.strudelEditorContainer.classList.add('glass-effect');
            } else {
                this.strudelEditorContainer.classList.remove('glass-effect');
            }
        }

        // Apply settings to both editors (font size + line numbers)
        const editorOptions = {
            fontSize: settings.fontSize,
            lineNumbers: settings.lineNumbers ? 'on' as const : 'off' as const,
            lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
            lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
        };

        if (this.textmodeEditor) {
            this.textmodeEditor.updateOptions(editorOptions);
        }
        if (this.strudelEditor) {
            this.strudelEditor.updateOptions(editorOptions);
        }

        this.renderOverlay();
    }

    /**
     * Handle share button (shares both textmode and strudel code)
     */
    private handleShare(): void {
        const textmodeCode = this.textmodeEditor?.getValue() ?? '';
        const strudelCode = this.strudelEditor?.getValue() ?? '';
        const url = getCombinedShareableUrl(textmodeCode, strudelCode);
        setCodesToHash(textmodeCode, strudelCode);
        navigator.clipboard.writeText(url).catch(() => {
            console.log('Share URL:', url);
        });
    }

    /**
     * Handle clear storage
     */
    private handleClearStorage(): void {
        this.storage.clearCode();
        this.appState?.setLastWorkingCode(null);

        // Reset both editors to defaults
        this.textmodeEditor?.setValue(defaultSketch);
        this.strudelEditor?.setValue(defaultStrudelSketch);

        // Stop audio
        this.audioController?.handleHush();

        // Use textmode controller for soft reset
        this.textmodeController?.handleSoftReset();
    }

    /**
     * Handle loading an example sketch (textmode)
     */
    private handleLoadExample(code: string): void {
        this.textmodeEditor?.setValue(code);
        this.saveTextmodeCode(code);
        // Use textmode controller for force run
        this.textmodeController?.handleForceRun();
    }

    /**
     * Handle dismiss error
     */
    private handleDismissError(): void {
        this.error = null;
        this.textmodeEditor?.clearMarkers();
        this.strudelEditor?.clearMarkers();
        this.renderOverlay();
    }

    /**
     * Toggle UI visibility
     */
    private toggleUIVisibility(): void {
        const newVisibility = !this.settings.uiVisible;
        this.settings = { ...this.settings, uiVisible: newVisibility };

        // Toggle textmode editor visibility
        if (this.textmodeEditorContainer) {
            this.textmodeEditorContainer.style.display = newVisibility ? '' : 'none';
        }

        // Toggle strudel panel visibility (entire panel since it has background)
        if (this.strudelPanel) {
            this.strudelPanel.style.display = newVisibility ? '' : 'none';
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
}
