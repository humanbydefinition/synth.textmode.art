/**
 * Plugin type definitions.
 * Core interfaces for the extensible plugin architecture.
 */

import type { AppSettings, CodeError } from '../types/app.types';
import type { IEditor } from './base';

/**
 * Plugin category determines where the plugin renders and its capabilities.
 */
export type PluginCategory = 'visual' | 'audio' | 'hybrid';

/**
 * An example sketch provided by a plugin.
 */
export interface Example {
	id: string;
	name: string;
	description: string;
	category: string;
	code: string;
}

/**
 * Describes optional capabilities a plugin can support.
 * Used by the app to enable/disable features for each plugin.
 */
export interface PluginCapabilities {
	/** Can receive audio data for reactive visual effects */
	supportsAudioReactivity?: boolean;

	/** Has pattern highlighting like Strudel */
	supportsPatternHighlighting?: boolean;

	/** Can be soft-reset without full reload (e.g., reset frame count) */
	supportsSoftReset?: boolean;

	/** Requires user interaction to initialize (Web Audio autoplay policy) */
	requiresUserInteraction?: boolean;

	/** Supports collaborative editing (future) */
	supportsCollaboration?: boolean;

	/**
	 * Runtime execution strategy:
	 * - 'sandboxed': Runs in iframe, provides security isolation (visual plugins)
	 * - 'direct': Runs in main thread, provides direct API access (audio plugins)
	 */
	runtimeStrategy?: 'sandboxed' | 'direct';
}

/**
 * Context provided to plugins during initialization.
 * Contains everything a plugin needs to set up its components.
 */
export interface PluginContext {
	/** Container element for the plugin's editor */
	editorContainer: HTMLElement;

	/** Container element for visual output (for visual/hybrid plugins) */
	visualContainer?: HTMLElement;

	/** Shared application state store - Removed */
	// appState: IAppState;

	/** Get current application settings */
	getSettings: () => AppSettings;

	/** Callbacks for controller integration */
	callbacks: BaseControllerCallbacks;

	/** Get initial code for the plugin (from storage or default) */
	getInitialCode: () => string;

	/** Toggle UI visibility callback */
	toggleUI: () => void;

	/** Change font size callback */
	changeFontSize: (delta: number) => void;
}

/**
 * Static metadata about a plugin.
 * Used for UI display and plugin registry.
 */
export interface PluginMetadata {
	/** Unique identifier for the plugin (e.g., 'textmode', 'strudel', 'hydra') */
	readonly id: string;

	/** Human-readable display name */
	readonly displayName: string;

	/** Short description of the plugin */
	readonly description?: string;

	/** Plugin category for UI grouping and feature enabling */
	readonly category: PluginCategory;

	/** Plugin capabilities */
	readonly capabilities: PluginCapabilities;

	/** URL to the plugin's documentation or homepage */
	readonly homepage?: string;

	/** Plugin version */
	readonly version?: string;
}

/**
 * Core plugin interface.
 * All plugins must implement this interface.
 */
export interface IPlugin extends PluginMetadata {
	/**
	 * Initialize the plugin with the provided context.
	 * Creates editor, runtime, and controller.
	 * @param context - Initialization context with containers and dependencies
	 */
	init(context: PluginContext): Promise<void>;

	/**
	 * Dispose all plugin resources.
	 * Called when the plugin is unloaded or the app is closed.
	 */
	dispose(): void;

	/**
	 * Get the plugin's controller for code execution.
	 * @throws Error if called before init()
	 */
	getController(): IController;

	/**
	 * Get the plugin's editor instance.
	 * May return null if editor hasn't been created yet.
	 */
	getEditor(): IEditor | null;

	/**
	 * Get the plugin's runtime instance.
	 * May return null if runtime hasn't been created yet.
	 */
	getRuntime(): IBaseRuntime | null;

	/**
	 * Check if the plugin is initialized.
	 */
	isInitialized(): boolean;

	/**
	 * Get default code for this plugin.
	 * Used by StorageService and Reset functionality.
	 */
	getDefaultCode(): string;

	/**
	 * Get examples provided by this plugin.
	 * Returned as a map of category names to lists of examples.
	 */
	getExamples(): Record<string, Example[]>;

	/**
	 * Set the code in the plugin's editor.
	 */
	setCode(code: string): void;
}

/**
 * Factory function that creates a plugin instance.
 * Used by the registry for lazy instantiation.
 */
export type PluginFactory = () => IPlugin;

/**
 * Events emitted by plugins.
 * Used for cross-plugin communication and app integration.
 */
export interface PluginEvents {
	/** Emitted when the plugin is ready */
	ready: () => void;

	/** Emitted when plugin encounters an error */
	error: (error: Error) => void;

	/** Emitted when code execution succeeds */
	runOk: () => void;

	/** Emitted when code execution fails */
	runError: (error: Error) => void;
}

/**
 * Extended interface for plugins that support audio reactivity.
 */
export interface IAudioReactivePlugin extends IPlugin {
	/**
	 * Send audio analysis data to the plugin for reactive visuals.
	 * @param data - Audio FFT and waveform data
	 */
	sendAudioData(data: AudioReactiveData): void;
}

/**
 * Audio analysis data for reactive plugins.
 */
export interface AudioReactiveData {
	/** FFT frequency data (normalized 0-1) */
	fft: Float32Array;

	/** Time domain waveform data (normalized -1 to 1) */
	waveform: Float32Array;

	/** Timestamp in milliseconds */
	timestamp: number;
}

/**
 * Type guard to check if a plugin supports audio reactivity.
 */
export function isAudioReactivePlugin(plugin: IPlugin): plugin is IAudioReactivePlugin {
	return (
		plugin.capabilities.supportsAudioReactivity === true &&
		'sendAudioData' in plugin &&
		typeof (plugin as IAudioReactivePlugin).sendAudioData === 'function'
	);
}

/**
 * Base runtime interface - shared methods expected by BaseController.
 */
export interface IBaseRuntime {
	/** Run code immediately without debounce */
	forceRun(code: string): void;
}

/**
 * Base callbacks shared by all controllers.
 */
export interface BaseControllerCallbacks {
	/** Called when overlay needs re-rendering */
	onRenderOverlay: () => void;
	/** Called to save code to storage */
	onSaveCode: (code: string) => void;
}

/**
 * Base dependencies shared by all controllers.
 * Generic over editor and runtime types.
 */
export interface BaseControllerDependencies<TEditor extends IEditor, TRuntime extends IBaseRuntime> {
	/** Get editor instance (may be null during init) */
	getEditor: () => TEditor | null;
	/** Get runtime instance (may be null during init) */
	getRuntime: () => TRuntime | null;
	/** Get current auto-execute setting */
	getAutoExecute: () => boolean;
	/** Get current auto-execute delay in ms */
	getAutoExecuteDelay: () => number;
}

/**
 * Common controller interface - shared methods all controllers implement.
 */
export interface IController {
	/** Handle code change (debounced execution) */
	handleCodeChange(code: string): void;
	/** Handle forced run (Ctrl+Enter) */
	handleForceRun(): void;
	/** Handle revert to last working code */
	handleRevertToLastWorking(): void;
	/** Handle error from runtime */
	handleError(error: CodeError): void;
}
