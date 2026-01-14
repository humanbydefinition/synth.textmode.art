/**
 * Plugin infrastructure exports.
 *
 * This module provides the core plugin architecture for the live coding editor.
 *
 * @example
 * ```typescript
 * // Creating a new plugin
 * import { BasePlugin, registerPlugin, type PluginContext } from '@/plugins';
 *
 * class MyPlugin extends BasePlugin<MyEditor, MyRuntime, MyController> {
 *     readonly id = 'my-plugin';
 *     readonly displayName = 'My Plugin';
 *     readonly category = 'visual';
 *     readonly capabilities = { supportsAudioReactivity: true };
 *
 *     protected createEditor(ctx: PluginContext, code: string) { ... }
 *     protected createRuntime(ctx: PluginContext) { ... }
 *     protected createController(ctx: PluginContext) { ... }
 *     protected getDefaultCode() { return '// Hello!'; }
 * }
 *
 * // Self-register the plugin
 * registerPlugin('my-plugin', () => new MyPlugin());
 * ```
 */

// Types
export type {
	IPlugin,
	PluginFactory,
	PluginContext,
	PluginCapabilities,
	PluginCategory,
	PluginMetadata,
	PluginEvents,
	IAudioReactivePlugin,
	AudioReactiveData,
	Example,
} from './types';

export { isAudioReactivePlugin } from './types';

// Registry
export { PluginRegistry, registerPlugin, getPlugin } from './PluginRegistry';