import {
	registerPlugin,
	type PluginContext,
	type IAudioReactivePlugin,
	type AudioReactiveData,
	type Example,
} from '../';
import { TextmodeEditor, type TextmodeEditorOptions } from './editor/TextmodeEditor';
import { TextmodeRuntime } from './runtime/host/TextmodeRuntime';
import { defaultTextmodeSketch } from './defaultSketch';
import { examples } from './examples';
import { TextmodeController, type TextmodeControllerDependencies } from './TextmodeController';
import type { BaseControllerCallbacks } from '../types';
import { BasePlugin } from '../base/BasePlugin';

/**
 * Textmode plugin for visual live coding with textmode.js
 */
export class TextmodePlugin
	extends BasePlugin<TextmodeEditor, TextmodeRuntime, TextmodeController>
	implements IAudioReactivePlugin {
	readonly id = 'textmode';
	readonly displayName = 'textmode.js';
	readonly description = 'Visual live coding with ASCII/text-based graphics';
	readonly category = 'visual' as const;
	readonly capabilities = {
		supportsAudioReactivity: true,
		supportsSoftReset: true,
		supportsPatternHighlighting: false,
		requiresUserInteraction: false,
		runtimeStrategy: 'sandboxed' as const,
	};
	readonly homepage = 'https://code.textmode.art';
	readonly version = '0.9.0';

	protected createEditor(context: PluginContext, initialCode: string): TextmodeEditor {
		const options: TextmodeEditorOptions = {
			container: context.editorContainer,
			initialValue: initialCode,
			fontSize: context.getSettings().fontSize,
			lineNumbers: context.getSettings().lineNumbers,
			onChange: (value) => this.controller?.handleCodeChange(value),
			onRun: () => this.controller?.handleForceRun(),
			onSoftReset: () => this.controller?.handleSoftReset(),
			onToggleUI: () => context.toggleUI(),
			onIncreaseFontSize: () => {
				context.changeFontSize(1);
			},
			onDecreaseFontSize: () => {
				context.changeFontSize(-1);
			},
		};
		return new TextmodeEditor(options);
	}

	protected createRuntime(context: PluginContext): TextmodeRuntime {
		this.runtime = new TextmodeRuntime({
			container: context.visualContainer ?? document.body,
			runnerUrl: '/src/plugins/textmode/runner/index.html',
			onReady: () => this.controller?.handleRuntimeReady(),
			onRunOk: () => this.controller?.handleRunOk(),
			onRunError: (error) => this.controller?.handleRunError(error),
			onSynthError: (error) => this.controller?.handleSynthError(error),
			onToggleUI: () => context.toggleUI(),
		});
		return this.runtime;
	}

	protected createController(context: PluginContext): TextmodeController {
		const callbacks: BaseControllerCallbacks = {
			onRenderOverlay: context.callbacks.onRenderOverlay,
			onSaveCode: context.callbacks.onSaveCode,
		};

		const deps: TextmodeControllerDependencies = {
			getEditor: () => this.editor,
			getRuntime: () => this.runtime,
			getAutoExecute: () => context.getSettings().autoExecute,
			getAutoExecuteDelay: () => context.getSettings().autoExecuteDelay,
		};

		return new TextmodeController(callbacks, deps);
	}

	getDefaultCode(): string {
		return defaultTextmodeSketch;
	}

	getExamples(): Record<string, Example[]> {
		return examples;
	}

	protected async initializeRuntime(): Promise<void> {
		this.runtime?.init();
	}

	/**
	 * Send audio data to the runtime for audio-reactive visuals.
	 */
	sendAudioData(data: AudioReactiveData): void {
		this.runtime?.sendAudioData({
			fft: data.fft,
			waveform: data.waveform,
			timestamp: data.timestamp,
		});
	}

	/**
	 * Trigger soft reset (reset frame count and re-run).
	 */
	softReset(): void {
		this.controller?.handleSoftReset();
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
}

// Self-register the plugin
registerPlugin('textmode', () => new TextmodePlugin());
