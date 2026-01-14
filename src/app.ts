/**
 * Main application - orchestrates Monaco editor, iframe runtime, React UI, and state
 * Full-screen layout with textmode.js visuals
 * 
 * NOTE: Strudel audio integration is disabled while app is closed-source.
 * The Strudel-related code has been removed but files are kept for future re-enablement.
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import { TextmodeEditor } from './editor';
import { HostRuntime } from './live/hostRuntime';
import { defaultTextmodeSketch } from './live/defaultTextmodeSketch';
import { setCodeToHash, getShareableUrl } from './live/share';
import { Overlay } from './components/Overlay';
import { MaintenancePage } from './components/MaintenancePage';
import { type MouseSonarHandle } from './components/MouseSonar';
import { DEFAULT_SETTINGS, type StatusState, type AppSettings, type ErrorInfo } from './types/app.types';
import { storageService, type IStorageService } from './services/StorageService';
import { ShortcutsManager, type IShortcutsManager } from './shortcuts/ShortcutsManager';
import { AppState, type IAppState } from './state/AppState';
import { TextmodeController, type ITextmodeController } from './controllers/TextmodeController';

export class App {
	// Services
	private storage: IStorageService = storageService;
	private shortcuts: IShortcutsManager | null = null;
	private appState: IAppState | null = null;
	private textmodeController: ITextmodeController | null = null;

	// Textmode (visuals)
	private textmodeEditor: TextmodeEditor | null = null;
	private textmodeRuntime: HostRuntime | null = null;
	private textmodePanel: HTMLElement | null = null;
	private textmodeEditorContainer: HTMLElement | null = null;

	// React overlay
	private overlayRoot: Root | null = null;
	private sonarRef = createRef<MouseSonarHandle>();

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

		// MAINTENANCE MODE
		// ----------------
		// Toggle this to disable the app and show the maintenance page
		if (true) {
			const container = document.getElementById('app-container');
			if (container) {
				const root = createRoot(container);
				root.render(createElement(MaintenancePage));
				return;
			}
		}

		// Get panel container from HTML
		this.textmodePanel = document.getElementById('textmode-panel');

		if (!this.textmodePanel) {
			console.error('Panel container not found in DOM');
			return;
		}

		// Create textmode editor container (inside panel)
		this.textmodeEditorContainer = document.createElement('div');
		this.textmodeEditorContainer.id = 'editor-container';
		if (this.settings.editorBackdrop) {
			this.textmodeEditorContainer.classList.add('glass-effect');
		}
		this.textmodePanel.appendChild(this.textmodeEditorContainer);

		// Create React overlay root
		const overlayRootEl = document.createElement('div');
		overlayRootEl.id = 'overlay-root';
		document.body.appendChild(overlayRootEl);
		this.overlayRoot = createRoot(overlayRootEl);

		// Load initial code
		const textmodeCode = this.loadTextmodeCode();

		// Create textmode Monaco editor
		this.textmodeEditor = new TextmodeEditor({
			container: this.textmodeEditorContainer,
			initialValue: textmodeCode,
			fontSize: this.settings.fontSize,
			lineNumbers: this.settings.lineNumbers,
			onChange: (value) => this.textmodeController?.handleCodeChange(value),
			onRun: () => this.textmodeController?.handleForceRun(),
			onSoftReset: () => this.textmodeController?.handleSoftReset(),
			onToggleUI: () => this.toggleUIVisibility(),
			onToggleTextBackground: () => this.handleSettingsChange({ ...this.settings, editorBackdrop: !this.settings.editorBackdrop }),
			onToggleAutoExecute: () => this.handleSettingsChange({ ...this.settings, autoExecute: !this.settings.autoExecute }),
			onIncreaseFontSize: () => this.handleFontSizeChange(1),
			onDecreaseFontSize: () => this.handleFontSizeChange(-1),
		});

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

		// Create iframe runtime for textmode (fullscreen canvas in background)
		this.textmodeRuntime = new HostRuntime({
			container: document.body,
			onReady: () => this.textmodeController!.handleRuntimeReady(),
			onRunOk: () => this.textmodeController!.handleRunOk(),
			onRunError: (error) => this.textmodeController!.handleRunError(error),
			onSynthError: (error) => this.textmodeController!.handleSynthError(error),
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
				toggleEditorBackdrop: () => this.handleSettingsChange({ ...this.settings, editorBackdrop: !this.settings.editorBackdrop }),
				toggleUIVisibility: () => this.toggleUIVisibility(),
			},
		});
		this.shortcuts.init();
	}



	/**
	 * Render React overlay
	 */
	private renderOverlay(): void {
		if (!this.overlayRoot) return;

		// Determine revert handler
		const hasLastWorking = this.lastWorkingCode !== null;
		const handleRevert = () => this.textmodeController?.handleRevertToLastWorking();

		this.overlayRoot.render(
			createElement(Overlay, {
				status: this.status,
				settings: this.settings,
				error: this.error,
				hasLastWorking: hasLastWorking,
				onSettingsChange: (settings) => this.handleSettingsChange(settings),
				onShare: () => this.handleShare(),
				onClearStorage: () => this.handleClearStorage(),
				onLoadExample: (code) => this.handleLoadExample(code),
				onDismissError: () => this.handleDismissError(),
				onRevertToLastWorking: handleRevert,
				sonarRef: this.sonarRef,
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
	 * Save textmode code to localStorage
	 */
	private saveTextmodeCode(code: string): void {
		this.storage.saveTextmodeCode(code);
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

		// Toggle glass effect on editor
		if (this.textmodeEditorContainer) {
			if (settings.editorBackdrop) {
				this.textmodeEditorContainer.classList.add('glass-effect');
			} else {
				this.textmodeEditorContainer.classList.remove('glass-effect');
			}
		}

		// Apply settings to editor (font size + line numbers)
		const editorOptions = {
			fontSize: settings.fontSize,
			lineNumbers: settings.lineNumbers ? 'on' as const : 'off' as const,
			lineNumbersMinChars: settings.lineNumbers ? 2 : 0,
			lineDecorationsWidth: settings.lineNumbers ? 16 : 0,
		};

		if (this.textmodeEditor) {
			this.textmodeEditor.updateOptions(editorOptions);
		}

		this.renderOverlay();
	}

	/**
	 * Handle share button (shares textmode code)
	 */
	private handleShare(): void {
		const textmodeCode = this.textmodeEditor?.getValue() ?? '';
		const url = getShareableUrl(textmodeCode);
		setCodeToHash(textmodeCode);
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

		// Reset editor to default
		this.textmodeEditor?.setValue(defaultTextmodeSketch);

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
