/**
 * Main application - orchestrates Monaco editor, iframe runtime, Strudel audio, React UI, and state
 * Split-screen layout with textmode.js visuals on left and Strudel audio on right
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import { createMonacoEditor, createErrorMarker, type MonacoEditorInstance } from './editor/monaco';
import { createStrudelMonacoEditor, createStrudelErrorMarker, type StrudelMonacoInstance } from './editor/strudelMonaco';
import { HostRuntime } from './live/hostRuntime';
import { StrudelRuntime, type StrudelPattern } from './live/strudel';
import { defaultSketch } from './live/defaultSketch';
import { defaultStrudelSketch } from './live/defaultStrudelSketch';
import { getCodeFromHash, setCodeToHash, getShareableUrl } from './live/share';
import { Overlay, type StatusState, type AppSettings, type ErrorInfo, type MouseSonarHandle, type AudioState } from './components/Overlay';

// Storage keys
const TEXTMODE_CODE_KEY = 'textmode_live_code';
const STRUDEL_CODE_KEY = 'strudel_live_code';
const SETTINGS_STORAGE_KEY = 'textmode_live_settings';

const DEFAULT_SETTINGS: AppSettings = {
    autoExecute: true,
    glassEffect: true,
    fontSize: 16,
    uiVisible: true,
};

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

export class App {
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

    // Split resizer
    private splitResizer: HTMLElement | null = null;
    private splitRatio = 0.5; // 50% by default

    // React overlay
    private overlayRoot: Root | null = null;
    private sonarRef = createRef<MouseSonarHandle>();

    // State
    private status: StatusState = 'ready';
    private error: ErrorInfo | null = null;
    private settings: AppSettings = DEFAULT_SETTINGS;
    private lastWorkingCode: string | null = null;
    private lastCtrlPressTime = 0;
    private activePanel: 'textmode' | 'strudel' = 'textmode';
    private isMobile = false;

    // Audio state
    private audioState: AudioState = {
        isPlaying: false,
        isInitialized: false,
    };

    // Pending confirmation for lastWorkingCode
    private pendingWorkingCode: string | null = null;
    private confirmationTimer: number | null = null;
    private static readonly CONFIRMATION_DELAY_MS = 100;

    /**
     * Initialize the application
     */
    init(): void {
        // Load settings
        this.settings = this.loadSettings();

        // Check if mobile
        this.isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        window.addEventListener('resize', () => this.handleResize());

        // Get panel containers from HTML
        this.textmodePanel = document.getElementById('textmode-panel');
        this.strudelPanel = document.getElementById('strudel-panel');

        if (!this.textmodePanel || !this.strudelPanel) {
            console.error('Panel containers not found in DOM');
            return;
        }

        // Setup mobile tab layout
        if (this.isMobile) {
            this.setupMobileLayout();
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

        // Create split resizer between the two panels
        this.setupSplitResizer();

        // Setup mobile touch handling for pinch-to-zoom
        this.setupMobileTouchHandling();

        // Create React overlay root
        const overlayRootEl = document.createElement('div');
        overlayRootEl.id = 'overlay-root';
        document.body.appendChild(overlayRootEl);
        this.overlayRoot = createRoot(overlayRootEl);

        // Load initial code
        const textmodeCode = this.loadTextmodeCode();
        const strudelCode = this.loadStrudelCode();

        // Create textmode Monaco editor
        this.textmodeEditor = createMonacoEditor({
            container: this.textmodeEditorContainer,
            initialValue: textmodeCode,
            onChange: (value) => this.handleTextmodeCodeChange(value),
            onRun: () => this.handleTextmodeForceRun(),
            onSoftReset: () => this.handleSoftReset(),
            onToggleUI: () => this.toggleUIVisibility(),
            onToggleTextBackground: () => this.handleSettingsChange({ ...this.settings, glassEffect: !this.settings.glassEffect }),
            onToggleAutoExecute: () => this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute }),
            onIncreaseFontSize: () => this.handleFontSizeChange(1),
            onDecreaseFontSize: () => this.handleFontSizeChange(-1),
            fontSize: this.settings.fontSize,
        });

        // Create Strudel Monaco editor
        this.strudelEditor = createStrudelMonacoEditor({
            container: this.strudelEditorContainer,
            initialValue: strudelCode,
            onChange: (value) => this.handleStrudelCodeChange(value),
            onRun: () => this.handleStrudelForceRun(),
            onHush: () => this.handleHush(),
            onToggleUI: () => this.toggleUIVisibility(),
            onIncreaseFontSize: () => this.handleFontSizeChange(1),
            onDecreaseFontSize: () => this.handleFontSizeChange(-1),
            fontSize: this.settings.fontSize,
        });

        // Create iframe runtime for textmode (fullscreen canvas in background)
        this.textmodeRuntime = new HostRuntime({
            container: document.body,
            onReady: () => this.handleRuntimeReady(),
            onRunOk: () => this.handleRunOk(),
            onRunError: (error) => this.handleRunError(error),
            onSynthError: (error) => this.handleSynthError(error),
        });

        // Create Strudel runtime (audio engine)
        this.strudelRuntime = new StrudelRuntime({
            onReady: () => this.handleStrudelReady(),
            onError: (error) => this.handleStrudelError(error),
            onPatternUpdate: (pattern) => this.handleStrudelPatternUpdate(pattern),
            onPlayStateChange: (isPlaying) => this.handleStrudelPlayStateChange(isPlaying),
        });

        // Initial render of React overlay
        this.renderOverlay();

        // Initialize textmode runtime
        this.textmodeRuntime.init();

        // Setup shortcuts
        this.setupGlobalShortcuts();

        // Track panel focus
        this.setupPanelFocusTracking();

        // Auto-initialize audio on first user interaction
        this.setupAutoAudioInit();
    }

    /**
     * Setup mobile tab layout
     */
    private setupMobileLayout(): void {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.add('tab-layout');
        }
        this.updateMobilePanelVisibility();
    }

    /**
     * Setup the split resizer between textmode and strudel panels
     */
    private setupSplitResizer(): void {
        const appContainer = document.getElementById('app-container');
        if (!appContainer || !this.textmodePanel || !this.strudelPanel) return;

        // Create resizer element
        this.splitResizer = document.createElement('div');
        this.splitResizer.id = 'split-resizer';

        // Insert resizer between the two panels
        appContainer.insertBefore(this.splitResizer, this.strudelPanel);

        // Apply initial split ratio
        this.applySplitRatio();

        // Drag state
        let isDragging = false;

        const startDrag = (e: MouseEvent) => {
            isDragging = true;
            this.splitResizer?.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        const onDrag = (e: MouseEvent) => {
            if (!isDragging) return;

            const containerRect = appContainer.getBoundingClientRect();
            
            // Calculate new ratio based on mouse position
            const relativeX = e.clientX - containerRect.left;
            let newRatio = relativeX / containerRect.width;

            // Clamp ratio between 20% and 80%
            newRatio = Math.max(0.2, Math.min(0.8, newRatio));

            this.splitRatio = newRatio;
            this.applySplitRatio();
        };

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            this.splitResizer?.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        // Event listeners
        this.splitResizer.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
    }

    /**
     * Apply the current split ratio to panels
     */
    private applySplitRatio(): void {
        if (!this.textmodePanel || !this.strudelPanel || this.isMobile) return;

        const resizerWidth = this.splitResizer?.offsetWidth ?? 8;
        
        // Use flex-basis instead of flex for precise control
        this.textmodePanel.style.flex = 'none';
        this.textmodePanel.style.width = `calc(${this.splitRatio * 100}% - ${resizerWidth / 2}px)`;
        
        this.strudelPanel.style.flex = 'none';
        this.strudelPanel.style.width = `calc(${(1 - this.splitRatio) * 100}% - ${resizerWidth / 2}px)`;
    }

    /**
     * Update mobile panel visibility based on active panel
     */
    private updateMobilePanelVisibility(): void {
        if (!this.isMobile) return;

        if (this.textmodePanel) {
            this.textmodePanel.classList.toggle('hidden', this.activePanel !== 'textmode');
        }
        if (this.strudelPanel) {
            this.strudelPanel.classList.toggle('hidden', this.activePanel !== 'strudel');
        }
    }

    /**
     * Handle window resize
     */
    private handleResize(): void {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

        if (wasMobile !== this.isMobile) {
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                if (this.isMobile) {
                    appContainer.classList.add('tab-layout');
                    this.updateMobilePanelVisibility();
                    // Reset flex styles for mobile
                    if (this.textmodePanel) {
                        this.textmodePanel.style.flex = '';
                        this.textmodePanel.style.width = '';
                    }
                    if (this.strudelPanel) {
                        this.strudelPanel.style.flex = '';
                        this.strudelPanel.style.width = '';
                    }
                } else {
                    appContainer.classList.remove('tab-layout');
                    // Show both panels on desktop
                    this.textmodePanel?.classList.remove('hidden');
                    this.strudelPanel?.classList.remove('hidden');
                    // Reapply split ratio for desktop
                    this.applySplitRatio();
                }
            }
            this.renderOverlay();
        }
    }

    /**
     * Handle mobile panel selection
     */
    private handleSelectPanel(panel: 'textmode' | 'strudel'): void {
        this.activePanel = panel;
        this.updateMobilePanelVisibility();

        // Focus the appropriate editor
        if (panel === 'textmode') {
            this.textmodeEditor?.editor.focus();
        } else {
            this.strudelEditor?.focus();
        }

        this.renderOverlay();
    }

    /**
     * Setup panel focus tracking
     */
    private setupPanelFocusTracking(): void {
        this.textmodePanel?.addEventListener('focusin', () => {
            this.activePanel = 'textmode';
        });

        this.strudelPanel?.addEventListener('focusin', () => {
            this.activePanel = 'strudel';
        });
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
                sonarRef: this.sonarRef,
                // Audio props
                audioState: this.audioState,
                onPlayAudio: () => this.handleStrudelForceRun(),
                onHushAudio: () => this.handleHush(),
                // Mobile props
                isMobile: this.isMobile,
                activePanel: this.activePanel,
                onSelectPanel: (panel) => this.handleSelectPanel(panel),
            })
        );
    }

    // ==================== Code Loading ====================

    /**
     * Load textmode code from URL hash, localStorage, or use default
     */
    private loadTextmodeCode(): string {
        const hashCode = getCodeFromHash();
        if (hashCode) return hashCode;

        const storedCode = localStorage.getItem(TEXTMODE_CODE_KEY);
        if (storedCode) return storedCode;

        return defaultSketch;
    }

    /**
     * Load strudel code from localStorage or use default
     */
    private loadStrudelCode(): string {
        const storedCode = localStorage.getItem(STRUDEL_CODE_KEY);
        if (storedCode) return storedCode;

        return defaultStrudelSketch;
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
     * Save textmode code to localStorage
     */
    private saveTextmodeCode(code: string): void {
        localStorage.setItem(TEXTMODE_CODE_KEY, code);
    }

    /**
     * Save strudel code to localStorage
     */
    private saveStrudelCode(code: string): void {
        localStorage.setItem(STRUDEL_CODE_KEY, code);
    }

    /**
     * Save settings to localStorage
     */
    private saveSettings(settings: AppSettings): void {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }

    // ==================== Textmode Handlers ====================

    /**
     * Handle textmode code changes (debounced execution)
     */
    private handleTextmodeCodeChange(code: string): void {
        this.saveTextmodeCode(code);
        if (this.settings.autoExecute) {
            this.textmodeRuntime?.runCode(code);
        }
    }

    /**
     * Handle forced textmode run (Ctrl+Enter)
     */
    private handleTextmodeForceRun(): void {
        const code = this.textmodeEditor?.getValue() ?? '';
        this.saveTextmodeCode(code);
        this.error = null;
        this.textmodeEditor?.clearMarkers();
        this.textmodeRuntime?.forceRun(code);
        this.renderOverlay();
    }

    /**
     * Handle soft reset (Ctrl+Shift+R)
     */
    private handleSoftReset(): void {
        const code = this.textmodeEditor?.getValue() ?? '';
        this.saveTextmodeCode(code);
        this.error = null;
        this.status = 'ready';
        this.textmodeEditor?.clearMarkers();
        this.textmodeRuntime?.softReset(code);
        this.renderOverlay();
    }

    /**
     * Handle revert to last working code
     */
    private handleRevertToLastWorking(): void {
        if (!this.lastWorkingCode) return;

        this.textmodeEditor?.setValue(this.lastWorkingCode);
        this.saveTextmodeCode(this.lastWorkingCode);
        this.error = null;
        this.textmodeEditor?.clearMarkers();
        this.textmodeRuntime?.forceRun(this.lastWorkingCode);
        this.renderOverlay();
    }

    // ==================== Strudel Handlers ====================

    /**
     * Handle strudel code changes (debounced execution)
     */
    private handleStrudelCodeChange(code: string): void {
        this.saveStrudelCode(code);
        if (this.settings.autoExecute && this.audioState.isInitialized) {
            this.strudelRuntime?.evaluate(code);
        }
    }

    /**
     * Handle forced strudel run (Ctrl+Enter)
     */
    private handleStrudelForceRun(): void {
        const code = this.strudelEditor?.getValue() ?? '';
        this.saveStrudelCode(code);
        this.strudelEditor?.clearMarkers();

        // Initialize audio if needed, then run
        if (!this.audioState.isInitialized) {
            this.handleInitAudio().then(() => {
                this.strudelRuntime?.forceEvaluate(code);
            });
        } else {
            this.strudelRuntime?.forceEvaluate(code);
        }
    }

    /**
     * Handle hush (stop audio)
     */
    private handleHush(): void {
        this.strudelRuntime?.hush();
    }

    /**
     * Initialize audio (must be triggered by user interaction)
     */
    private async handleInitAudio(): Promise<void> {
        if (this.audioState.isInitialized) return;

        await this.strudelRuntime?.init();
    }

    /**
     * Setup automatic audio initialization on first user interaction
     * This satisfies Web Audio autoplay policy without requiring explicit UI action
     */
    private setupAutoAudioInit(): void {
        const initOnInteraction = () => {
            if (!this.audioState.isInitialized) {
                this.handleInitAudio();
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', initOnInteraction);
            document.removeEventListener('keydown', initOnInteraction);
            document.removeEventListener('touchstart', initOnInteraction);
        };

        document.addEventListener('click', initOnInteraction);
        document.addEventListener('keydown', initOnInteraction);
        document.addEventListener('touchstart', initOnInteraction);
    }

    /**
     * Handle Strudel runtime ready
     */
    private handleStrudelReady(): void {
        this.audioState = { ...this.audioState, isInitialized: true };
        this.renderOverlay();
    }

    /**
     * Handle Strudel error
     */
    private handleStrudelError(error: { message: string; stack?: string; line?: number; column?: number }): void {
        this.error = {
            message: `[Strudel] ${error.message}`,
            stack: error.stack,
            line: error.line,
            column: error.column,
        };

        if (this.strudelEditor && error.line) {
            const marker = createStrudelErrorMarker(error.message, error.line, error.column);
            this.strudelEditor.setMarkers([marker]);
        }

        this.renderOverlay();
    }

    /**
     * Handle Strudel pattern update
     */
    private handleStrudelPatternUpdate(pattern: StrudelPattern | null): void {
        // Pattern evaluated successfully, clear any errors
        this.strudelEditor?.clearMarkers();
        if (this.error?.message.startsWith('[Strudel]')) {
            this.error = null;
        }

        // Update highlighting with the new pattern
        if (this.strudelEditor && this.strudelRuntime && pattern) {
            this.strudelEditor.setPattern(
                pattern,
                () => this.strudelRuntime!.getTime(),
                () => this.strudelRuntime!.getCycle()
            );
            this.strudelEditor.startHighlighting();
        }

        this.renderOverlay();
    }

    /**
     * Handle Strudel play state change
     */
    private handleStrudelPlayStateChange(isPlaying: boolean): void {
        this.audioState = { ...this.audioState, isPlaying };
        
        // Control highlighting based on play state
        if (!isPlaying) {
            this.strudelEditor?.stopHighlighting();
        }
        
        this.renderOverlay();
    }

    // ==================== Common Handlers ====================

    /**
     * Handle settings change
     */
    private handleSettingsChange(settings: AppSettings): void {
        this.settings = settings;
        this.saveSettings(settings);

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

        // Apply font size to both editors
        if (this.textmodeEditor) {
            this.textmodeEditor.updateOptions({ fontSize: settings.fontSize });
        }
        if (this.strudelEditor) {
            this.strudelEditor.updateOptions({ fontSize: settings.fontSize });
        }

        this.renderOverlay();
    }

    /**
     * Handle share button (shares textmode code)
     */
    private handleShare(): void {
        const code = this.textmodeEditor?.getValue() ?? '';
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
        localStorage.removeItem(TEXTMODE_CODE_KEY);
        localStorage.removeItem(STRUDEL_CODE_KEY);
        this.lastWorkingCode = null;

        // Reset both editors to defaults
        this.textmodeEditor?.setValue(defaultSketch);
        this.strudelEditor?.setValue(defaultStrudelSketch);

        // Stop audio
        this.handleHush();

        this.handleSoftReset();
    }

    /**
     * Handle loading an example sketch (textmode)
     */
    private handleLoadExample(code: string): void {
        this.textmodeEditor?.setValue(code);
        this.saveTextmodeCode(code);
        this.error = null;
        this.textmodeEditor?.clearMarkers();
        this.textmodeRuntime?.forceRun(code);
        this.renderOverlay();
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
     * Handle runtime ready signal (textmode)
     */
    private handleRuntimeReady(): void {
        this.status = 'ready';
        this.renderOverlay();

        // Auto-run initial code
        const code = this.textmodeEditor?.getValue() ?? '';
        if (code) {
            this.textmodeRuntime?.runCode(code);
        }
    }

    /**
     * Handle successful code execution (textmode)
     */
    private handleRunOk(): void {
        const code = this.textmodeEditor?.getValue() ?? '';

        // Cancel any pending confirmation
        if (this.confirmationTimer !== null) {
            clearTimeout(this.confirmationTimer);
        }

        // Store as pending
        this.pendingWorkingCode = code;

        this.confirmationTimer = window.setTimeout(() => {
            if (this.pendingWorkingCode !== null) {
                this.lastWorkingCode = this.pendingWorkingCode;
                this.pendingWorkingCode = null;
            }
            this.confirmationTimer = null;
        }, App.CONFIRMATION_DELAY_MS);

        this.status = 'running';
        this.error = null;
        this.textmodeEditor?.clearMarkers();
        this.renderOverlay();
    }

    /**
     * Handle code execution error (textmode)
     */
    private handleRunError(error: ErrorInfo): void {
        this.status = 'error';
        this.error = error;

        if (this.textmodeEditor) {
            const marker = createErrorMarker(error.message, error.line, error.column);
            this.textmodeEditor.setMarkers([marker]);
        }

        this.renderOverlay();
    }

    /**
     * Handle synth dynamic parameter error (textmode)
     */
    private handleSynthError(error: ErrorInfo): void {
        if (this.confirmationTimer !== null) {
            clearTimeout(this.confirmationTimer);
            this.confirmationTimer = null;
        }
        this.pendingWorkingCode = null;

        this.status = 'error';
        this.error = error;

        this.renderOverlay();
    }

    /**
     * Setup keyboard shortcuts
     */
    private setupGlobalShortcuts(): void {
        window.addEventListener('keydown', (e) => {
            // Double-tap Ctrl: Trigger mouse sonar ping
            if (e.key === 'Control' && !e.repeat) {
                const now = Date.now();
                if (now - this.lastCtrlPressTime < 400) {
                    this.sonarRef.current?.ping();
                    this.lastCtrlPressTime = 0;
                } else {
                    this.lastCtrlPressTime = now;
                }
            }

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

            // Ctrl + .: Hush audio (global shortcut)
            if (e.ctrlKey && e.key === '.') {
                e.preventDefault();
                this.handleHush();
            }
        });
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

    /**
     * Setup mobile touch handling for pinch-to-zoom
     */
    private setupMobileTouchHandling(): void {
        const setupForContainer = (container: HTMLElement | null) => {
            if (!container) return;

            let touchCount = 0;

            container.addEventListener('touchstart', (e) => {
                touchCount = e.touches.length;
                if (touchCount >= 2) {
                    container.style.pointerEvents = 'none';
                }
            }, { passive: true });

            container.addEventListener('touchend', () => {
                touchCount = 0;
                container.style.pointerEvents = 'auto';
            }, { passive: true });

            container.addEventListener('touchcancel', () => {
                touchCount = 0;
                container.style.pointerEvents = 'auto';
            }, { passive: true });
        };

        setupForContainer(this.textmodeEditorContainer);
        setupForContainer(this.strudelEditorContainer);

        // Reset viewport zoom on page load
        window.addEventListener('load', () => {
            setTimeout(() => {
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
