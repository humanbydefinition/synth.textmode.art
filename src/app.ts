/**
 * Main application - orchestrates plugins, React UI, and state.
 * Uses the plugin architecture for extensible creative coding support.
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement, createRef } from 'react';
import { AppShell } from './components/AppShell';
import { type PaneConfig } from './components/EditorLayout';
import { type MouseSonarHandle } from './components/MouseSonar';
import { type AppSettings } from './types/app.types';
import { storageService, type IStorageService } from './services/StorageService';
import { ShortcutsManager, type IShortcutsManager } from './managers/ShortcutsManager';

import { PluginManager } from './managers/PluginManager';
import { EditorManager } from './managers/EditorManager';
import { PluginRegistry } from './plugins';
import { useAppStore, initAppStore } from './stores/appStore';

// Import plugin configuration (registers all plugins)
import { registerCorePlugins } from './config/plugins';

// Initialize core plugins
registerCorePlugins();

/**
 * Interface for React layout state management.
 */
interface LayoutState {
	paneContainers: Map<string, HTMLElement>;
}

export class App {
	// Core services
	private storage: IStorageService = storageService;
	private shortcuts: IShortcutsManager | null = null;
	private pluginManager: PluginManager | null = null;
	private editorManager: EditorManager = new EditorManager();

	// React root (single unified root)
	private root: Root | null = null;
	private sonarRef = createRef<MouseSonarHandle>();

	// Layout state (managed by React, but tracked here for callbacks)
	private layoutState: LayoutState = {
		paneContainers: new Map(),
	};

	// Pane configurations (generated from plugins)
	private paneConfigs: PaneConfig[] = [];

	// Convenience accessors
	private get settings(): AppSettings {
		return useAppStore.getState().settings;
	}

	/**
	 * Initialize the application
	 */
	async init(): Promise<void> {
		// Create state store with loaded settings
		this.storage.loadSettings();

		// Get all registered plugins
		const registry = PluginRegistry.getInstance();
		const pluginList = Array.from(registry.getAll().values());

		// Generate pane configurations from plugins
		this.paneConfigs = pluginList.map((plugin) => ({
			id: plugin.id,
			pluginId: plugin.id,
			instanceId: 'main',
		}));

		// Set default active panel in Zustand store
		if (this.paneConfigs.length > 0) {
			useAppStore.getState().setActivePanel(this.paneConfigs[0].id);
		}

		// Initialize panels in Zustand store (using displayName for labels)
		const panels = pluginList.map((p) => ({ id: p.id, label: p.displayName }));
		useAppStore.getState().setPanels(panels);

		// Initialize UI store with resize listener
		initAppStore();

		// Create single React root
		const appContainer = document.getElementById('app-container');
		if (!appContainer) {
			console.error('App container #app-container not found');
			return;
		}
		this.root = createRoot(appContainer);

		// Render unified app and wait for all pane containers to be ready
		const expectedPanes = new Set(this.paneConfigs.map((p) => p.id));
		await new Promise<void>((resolve) => {
			// Check if already ready (shouldn't be, but just in case)
			if (expectedPanes.size === 0) {
				resolve();
				return;
			}

			// Store resolve for onPaneReady callback
			const checkAllReady = () => {
				if (this.layoutState.paneContainers.size >= expectedPanes.size) {
					resolve();
				}
			};

			// Save original callback to chain
			const originalOnPaneReady = (paneId: string, container: HTMLElement) => {
				this.layoutState.paneContainers.set(paneId, container);
				checkAllReady();
			};

			// Render unified app with container callback
			this.root!.render(
				createElement(AppShell, {
					panes: this.paneConfigs,
					editorBackdrop: this.settings.editorBackdrop,
					onPaneReady: originalOnPaneReady,
					...this.getShellProps(),
					sonarRef: this.sonarRef,
				})
			);
		});

		// Create Plugin Manager with layout adapter
		const layoutAdapter = {
			init: () => { },
			setActivePanel: (panelId: string) => {
				useAppStore.getState().setActivePanel(panelId);
				this.render();
			},
			getPluginContainer: (pluginId: string): HTMLElement => {
				const container = this.layoutState.paneContainers.get(pluginId);
				if (!container) {
					throw new Error(`Container for plugin "${pluginId}" not found`);
				}
				return container;
			},
			dispose: () => { },
		} as any; /* eslint-disable-line @typescript-eslint/no-explicit-any */

		// Define getters dynamically to capture 'this' without aliasing
		Object.defineProperties(layoutAdapter, {
			isMobile: {
				get: () => useAppStore.getState().isMobile,
			},
			activePanel: {
				get: () => useAppStore.getState().activePanel,
			},
			splitRatio: {
				get: () => useAppStore.getState().splitRatio,
			},
		});



		this.pluginManager = new PluginManager(this.storage, layoutAdapter, {
			getSettings: () => this.settings,
			renderOverlay: () => this.render(),
			toggleUI: () => this.toggleUIVisibility(),
			changeFontSize: (delta: number) => this.handleFontSizeChange(delta),
		});

		// Initialize plugins
		await this.pluginManager.initPlugins();

		// Register plugin editors with EditorManager
		for (const plugin of this.pluginManager.getAll()) {
			const editor = plugin.getEditor();
			if (editor) {
				this.editorManager.registerEditor(plugin.id, editor);
			}
		}

		// Apply initial settings
		this.editorManager.applySettings(this.settings);

		// Initial render already done above

		// Create shortcuts manager
		this.shortcuts = new ShortcutsManager({
			actions: {
				triggerSonarPing: () => this.sonarRef.current?.ping(),
				changeFontSize: (delta) => this.handleFontSizeChange(delta),
				toggleAutoExecute: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, autoExecute: !s.autoExecute });
				},
				toggleEditorBackdrop: () => {
					const s = this.settings;
					useAppStore.getState().setSettings({ ...s, editorBackdrop: !s.editorBackdrop });
				},
				toggleUIVisibility: () => this.toggleUIVisibility(),
				hushAudio: () => this.pluginManager?.hushAll(),
			},
		});
		this.shortcuts.init();

		// Setup audio reactivity
		this.pluginManager.setupAudioReactivity();

		// Subscribe to settings changes to update editors and storage
		useAppStore.subscribe(
			(state) => state.settings,
			(settings) => {
				this.storage.saveSettings(settings);
				this.editorManager.applySettings(settings);
				// No need to call render() as components subscribe to settings directly
			}
		);

		// Subscribe to UI visibility changes to toggle app container
		useAppStore.subscribe(
			(state) => state.settings.uiVisible,
			(uiVisible) => {
				const appContainer = document.getElementById('app-container');
				if (appContainer) {
					appContainer.style.display = uiVisible ? '' : 'none';
				}
			}
		);
	}

	/**
	 * Get props for the shell UI layer
	 */
	private getShellProps() {
		const errorSource = useAppStore.getState().error?.source;

		const handleRevert = () => {
			if (errorSource) {
				this.pluginManager?.get(errorSource)?.getController().handleRevertToLastWorking();
			}
		};

		return {
			onShare: () => this.handleShare(),
			onClearStorage: () => this.handleClearStorage(),
			onLoadExample: (code: string, pluginId: string) => this.handleLoadExample(code, pluginId),
			onRevertToLastWorking: handleRevert,
		};
	}

	/**
	 * Render the unified React app
	 */
	private render(): void {
		if (!this.root) return;

		this.root.render(
			createElement(AppShell, {
				panes: this.paneConfigs,
				editorBackdrop: this.settings.editorBackdrop,
				onPaneReady: (paneId: string, container: HTMLElement) => {
					this.layoutState.paneContainers.set(paneId, container);
				},
				...this.getShellProps(),
				sonarRef: this.sonarRef,
			})
		);
	}



	/**
	 * Handle share button
	 */
	private handleShare(): void {
		// TODO: Implement share functionality
	}

	/**
	 * Handle clear storage
	 */
	private handleClearStorage(): void {
		this.storage.clearCode();
		this.pluginManager?.resetAll();
	}

	/**
	 * Handle loading an example sketch
	 */
	private handleLoadExample(code: string, pluginId: string): void {
		const plugin = this.pluginManager?.get(pluginId);

		if (plugin) {
			plugin.setCode(code);
			this.storage.savePluginCode(pluginId, code);
			plugin.getController().handleForceRun();

			if (useAppStore.getState().isMobile) {
				useAppStore.getState().setActivePanel(pluginId);
				this.render();
			}
		}
	}

	/**
	 * Toggle UI visibility
	 */
	private toggleUIVisibility(): void {
		const newVisibility = !this.settings.uiVisible;
		const s = this.settings;
		useAppStore.getState().setSettings({ ...s, uiVisible: newVisibility });
	}

	/**
	 * Handle font size change
	 */
	private handleFontSizeChange(delta: number): void {
		const currentSize = this.settings.fontSize;
		const newSize = Math.min(32, Math.max(10, currentSize + delta));
		if (newSize !== currentSize) {
			const s = this.settings;
			useAppStore.getState().setSettings({ ...s, fontSize: newSize });
		}
	}
}
