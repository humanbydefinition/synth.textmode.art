/**
 * Application-wide type definitions.
 * Centralized types used across the UI and application logic.
 */

/**
 * Application settings persisted to localStorage.
 */
export interface AppSettings {
	/** Run code automatically on changes */
	autoExecute: boolean;
	/** Show dark glass backdrop behind editor text */
	editorBackdrop: boolean;
	/** Editor font size in pixels */
	fontSize: number;
	/** Whether UI overlays are visible */
	uiVisible: boolean;
	/** Whether line numbers are shown in the editor */
	lineNumbers: boolean;
	/** Delay in milliseconds before auto-executing code */
	autoExecuteDelay: number;
	/** Editor orientation (horizontal/vertical) */
	editorOrientation: 'horizontal' | 'vertical';
	/** Split ratio between panes (0.0 to 1.0) */
	splitRatio: number;
}

/**
 * Default application settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
	autoExecute: true,
	editorBackdrop: true,
	fontSize: 16,
	uiVisible: true,
	lineNumbers: false,
	autoExecuteDelay: 500,
	editorOrientation: 'horizontal',
	splitRatio: 0.5,
};

/**
 * Host services provided by the application to managers and plugins.
 * Consolidates application-level callbacks into a single interface.
 */
export interface HostServices {
	/** Get current application settings */
	getSettings: () => AppSettings;
	/** Trigger overlay re-render */
	renderOverlay: () => void;
	/** Toggle UI visibility */
	toggleUI: () => void;
	/** Change font size by delta */
	changeFontSize: (delta: number) => void;
}

/**
 * Error information for display in the UI and marker creation.
 * Consolidates error reporting across runtimes and controllers.
 */
export interface CodeError {
	/** Error message */
	message: string;
	/** Full stack trace */
	stack?: string;
	/** Line number in user code (1-indexed) */
	line?: number;
	/** Column number in user code (1-indexed) */
	column?: number;
	/** Source of the error (e.g., 'textmode' or 'strudel') */
	source?: string;
}

/**
 * Status indicator states for the application.
 * - ready: waiting for code changes
 * - running: sketch is actively running
 * - updated: code executed successfully (transient state)
 * - error: execution failed
 */
export type StatusState = 'ready' | 'running' | 'updated' | 'error';

/**
 * Minimal interface for providing plugin containers.
 * Used by PluginManager to get container elements for each plugin.
 * This abstracts over the React-based layout implementation.
 */
export interface IPluginContainerProvider {
	/** Get the container element for a specific plugin's editor. */
	getPluginContainer(pluginId: string): HTMLElement;
}

