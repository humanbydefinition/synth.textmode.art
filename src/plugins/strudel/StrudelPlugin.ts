import { registerPlugin, type PluginContext, type Example } from '../';
import { StrudelEditor, type StrudelEditorOptions } from './editor/StrudelEditor';
import { StrudelRuntime } from './runtime';
import { defaultStrudelSketch } from './defaultSketch';
import { examples } from './examples';
import { StrudelController, type StrudelControllerDependencies } from './StrudelController';
import type { BaseControllerCallbacks } from '../types';
import { BasePlugin } from '../base/BasePlugin';
import { useAppStore } from '@/stores/appStore';

/**
 * Strudel plugin for audio live coding with Strudel/TidalCycles patterns.
 */
export class StrudelPlugin extends BasePlugin<StrudelEditor, StrudelRuntime, StrudelController> {

	readonly id = 'strudel';
	readonly displayName = 'strudel';
	readonly description = 'Web-based environment for live coding algorithmic patterns';
	readonly category = 'audio' as const;
	readonly capabilities = {
		supportsAudioReactivity: false,
		supportsSoftReset: false,
		supportsPatternHighlighting: true,
		requiresUserInteraction: true, // Web Audio autoplay policy
		runtimeStrategy: 'direct' as const,
	};
	readonly homepage = 'https://strudel.cc';
	readonly version = '1.2.6';

	protected createEditor(context: PluginContext, initialCode: string): StrudelEditor {
		const options: StrudelEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
			onHush: () => this.controller?.handleHush(),
			onToggleUI: () => context.toggleUI(),
			onIncreaseFontSize: () => {
				context.changeFontSize(1);
			},
			onDecreaseFontSize: () => {
				context.changeFontSize(-1);
			},
		};
		return new StrudelEditor(options);
	}

	protected createRuntime(): StrudelRuntime {
		return new StrudelRuntime({
			onReady: () => this.controller?.handleRuntimeReady(),
			onError: (error) => this.controller?.handleError(error),
			onPatternUpdate: (pattern) => this.controller?.handlePatternUpdate(pattern),
			onPlayStateChange: (isPlaying) => this.controller?.handlePlayStateChange(isPlaying),
		});
	}

	protected createController(context: PluginContext): StrudelController {
		const callbacks: BaseControllerCallbacks = {
			onRenderOverlay: context.callbacks.onRenderOverlay,
			onSaveCode: context.callbacks.onSaveCode,
		};

		const deps: StrudelControllerDependencies = {
			getEditor: () => this.editor,
			getRuntime: () => this.runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
		};

		return new StrudelController(callbacks, deps);
	}

	getDefaultCode(): string {
		return defaultStrudelSketch;
	}

	getExamples(): Record<string, Example[]> {
		return examples;
	}

	protected async initializeRuntime(): Promise<void> {
		// Initialize state defaults
		useAppStore.getState().setPluginCustomState(this.id, 'state', {
			isPlaying: false,
			isInitialized: false,
		});

		// StrudelRuntime requires user interaction for Web Audio
		// Setup auto-init on first user interaction
		this.controller?.setupAutoAudioInit();
	}

	protected onDispose(): void {
		this.controller?.dispose();
	}

	/**
	 * Hush/stop audio playback.
	 */
	hush(): void {
		this.controller?.handleHush();
	}

	/**
	 * Initialize audio engine (must be triggered by user interaction).
	 */
	async initAudio(): Promise<void> {
		await this.controller?.handleInitAudio();
	}

	/**
	 * Get current code from editor.
	 */
	getCode(): string {
		return this.editor?.getValue() ?? '';
	}

	/**
	 * Set code in editor.
	 */
	setCode(code: string): void {
		this.editor?.setValue(code);
	}

	/**
	 * Check if audio is initialized.
	 */
	isAudioInitialized(): boolean {
		return this.runtime?.isInitialized() ?? false;
	}

	/**
	 * Check if audio is playing.
	 */
	isPlaying(): boolean {
		return this.runtime?.getIsPlaying() ?? false;
	}
}

// Self-register the plugin
registerPlugin('strudel', () => new StrudelPlugin());
