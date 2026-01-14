import type { IPlugin, PluginContext, PluginCapabilities, PluginCategory, Example } from '../types';
import type { IController, IBaseRuntime } from '../types';
import type { BaseController } from './BaseController';
import type { IEditor } from './BaseEditor';

/**
 * Abstract base class for plugins.
 * Handles common initialization patterns and lifecycle management.
 *
 * @template TEditor - The editor type
 * @template TRuntime - The runtime type
 * @template TController - The controller type
 *
 * @example
 * ```typescript
 * class HydraPlugin extends BasePlugin<HydraEditor, HydraRuntime, HydraController> {
 *     readonly id = 'hydra';
 *     readonly displayName = 'Hydra';
 *     readonly category = 'visual';
 *     readonly capabilities = { supportsAudioReactivity: true };
 *
 *     protected createEditor(ctx, code) { return new HydraEditor(...); }
 *     protected createRuntime(ctx) { return new HydraRuntime(...); }
 *     protected createController(ctx) { return new HydraController(...); }
 *     protected getDefaultCode() { return '// Hello Hydra!'; }
 * }
 * ```
 */
export abstract class BasePlugin<
	TEditor extends IEditor,
	TRuntime extends IBaseRuntime,
	TController extends BaseController<TEditor, TRuntime>,
> implements IPlugin {
	/** Unique identifier for the plugin */
	abstract readonly id: string;

	/** Human-readable display name */
	abstract readonly displayName: string;

	/** Plugin category */
	abstract readonly category: PluginCategory;

	/** Plugin capabilities */
	abstract readonly capabilities: PluginCapabilities;

	/** Short description */
	readonly description?: string;

	/** Homepage URL */
	readonly homepage?: string;

	/** Plugin version */
	readonly version?: string;

	protected context: PluginContext | null = null;
	protected editor: TEditor | null = null;
	protected runtime: TRuntime | null = null;
	protected controller: TController | null = null;
	private _initialized = false;

	/**
	 * Initialize the plugin.
	 * Creates editor, runtime, and controller in the correct order.
	 */
	async init(context: PluginContext): Promise<void> {
		if (this._initialized) {
			console.warn(`[${this.id}] Plugin already initialized`);
			return;
		}

		this.context = context;

		// Load initial code
		const code = await this.loadCode();

		// Create components in order: editor first (for UI), then runtime, then controller
		this.editor = this.createEditor(context, code);
		this.runtime = this.createRuntime(context);
		this.controller = this.createController(context);

		// Initialize runtime (may be async for audio initialization)
		await this.initializeRuntime();

		this._initialized = true;
	}

	/**
	 * Dispose all plugin resources.
	 */
	dispose(): void {
		if (!this._initialized) return;

		// Dispose in reverse order
		this.onDispose();
		this.controller = null;

		// Check if runtime has dispose method
		if (this.runtime && 'dispose' in this.runtime && typeof this.runtime.dispose === 'function') {
			(this.runtime as { dispose(): void }).dispose();
		}
		this.runtime = null;

		// Check if editor has dispose method
		if (this.editor && 'dispose' in this.editor && typeof this.editor.dispose === 'function') {
			(this.editor as { dispose(): void }).dispose();
		}
		this.editor = null;

		this.context = null;
		this._initialized = false;
	}

	/**
	 * Get the plugin's controller.
	 * @throws Error if called before init()
	 */
	getController(): IController {
		if (!this.controller) {
			throw new Error(`[${this.id}] Plugin not initialized. Call init() first.`);
		}
		return this.controller;
	}

	/**
	 * Get the plugin's editor.
	 */
	getEditor(): TEditor | null {
		return this.editor;
	}

	/**
	 * Get the plugin's runtime.
	 */
	getRuntime(): TRuntime | null {
		return this.runtime;
	}

	/**
	 * Check if the plugin is initialized.
	 */
	isInitialized(): boolean {
		return this._initialized;
	}

	/**
	 * Create the plugin's editor.
	 * @param context - Plugin context with containers and dependencies
	 * @param initialCode - Initial code to load into the editor
	 */
	protected abstract createEditor(context: PluginContext, initialCode: string): TEditor;

	/**
	 * Create the plugin's runtime.
	 * @param context - Plugin context with containers and dependencies
	 */
	protected abstract createRuntime(context: PluginContext): TRuntime;

	/**
	 * Create the plugin's controller.
	 * @param context - Plugin context with containers and dependencies
	 */
	protected abstract createController(context: PluginContext): TController;

	/**
	 * Get default code for this plugin.
	 * Used when no saved code is found.
	 */
	/**
	 * Get default code for this plugin.
	 * Used when no saved code is found.
	 */
	abstract getDefaultCode(): string;

	/**
	 * Initialize the runtime after creation.
	 * Override for async initialization (e.g., Web Audio).
	 */
	protected async initializeRuntime(): Promise<void> {
		// Default: no-op. Override for custom initialization.
	}

	/**
	 * Called during dispose before components are cleaned up.
	 * Override to add custom cleanup logic.
	 */
	protected onDispose(): void {
		// Default: no-op. Override for custom cleanup.
	}

	/**
	 * Load code for this plugin.
	 * Default implementation uses getInitialCode from context with fallback to default code.
	 * Override for custom loading logic (e.g., from URL hash).
	 */
	protected async loadCode(): Promise<string> {
		return this.context?.getInitialCode?.() ?? this.getDefaultCode();
	}

	/**
	 * Get examples provided by this plugin.
	 * Default implementation returns empty object.
	 */
	getExamples(): Record<string, Example[]> {
		return {};
	}

	/**
	 * Set the code in the plugin's editor.
	 */
	setCode(code: string): void {
		this.editor?.setValue(code);
	}
}
