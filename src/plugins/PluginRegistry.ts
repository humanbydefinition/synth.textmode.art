import type { IPlugin, PluginFactory, PluginCategory } from './types';

/**
 * Registry entry containing factory and optional metadata.
 */
interface RegistryEntry {
	factory: PluginFactory;
	/** Cached instance after first instantiation */
	instance?: IPlugin;
}

/**
 * Central registry for all plugins.
 * Implements singleton pattern for global access.
 *
 * Usage:
 * ```typescript
 * // Register a plugin (typically in plugin's index.ts)
 * registerPlugin('hydra', () => new HydraPlugin());
 *
 * // Get all registered plugins
 * const registry = PluginRegistry.getInstance();
 * for (const [id, plugin] of registry.getAll()) {
 *     await plugin.init(context);
 * }
 * ```
 */
export class PluginRegistry {
	private static instance: PluginRegistry;
	private plugins: Map<string, RegistryEntry> = new Map();

	/**
	 * Private constructor for singleton pattern.
	 */
	private constructor() {}

	/**
	 * Get the singleton instance.
	 */
	static getInstance(): PluginRegistry {
		if (!PluginRegistry.instance) {
			PluginRegistry.instance = new PluginRegistry();
		}
		return PluginRegistry.instance;
	}

	/**
	 * Register a plugin factory.
	 * @param id - Unique plugin identifier
	 * @param factory - Factory function that creates the plugin
	 */
	register(id: string, factory: PluginFactory): void {
		if (this.plugins.has(id)) {
			console.warn(`[PluginRegistry] Plugin "${id}" is already registered. Overwriting.`);
		}
		this.plugins.set(id, { factory });
	}

	/**
	 * Unregister a plugin.
	 * @param id - Plugin identifier to remove
	 * @returns true if plugin was removed, false if not found
	 */
	unregister(id: string): boolean {
		const entry = this.plugins.get(id);
		if (entry?.instance) {
			entry.instance.dispose();
		}
		return this.plugins.delete(id);
	}

	/**
	 * Check if a plugin is registered.
	 * @param id - Plugin identifier
	 */
	has(id: string): boolean {
		return this.plugins.has(id);
	}

	/**
	 * Get a plugin instance by ID.
	 * Creates the instance if it doesn't exist yet (lazy instantiation).
	 * @param id - Plugin identifier
	 * @returns Plugin instance or undefined if not registered
	 */
	get(id: string): IPlugin | undefined {
		const entry = this.plugins.get(id);
		if (!entry) return undefined;

		// Lazy instantiation
		if (!entry.instance) {
			entry.instance = entry.factory();
		}
		return entry.instance;
	}

	/**
	 * Get all registered plugin IDs.
	 */
	getIds(): string[] {
		return Array.from(this.plugins.keys());
	}

	/**
	 * Get all registered plugins as [id, instance] pairs.
	 * Instantiates plugins that haven't been created yet.
	 */
	getAll(): Map<string, IPlugin> {
		const result = new Map<string, IPlugin>();
		for (const [id, entry] of this.plugins) {
			if (!entry.instance) {
				entry.instance = entry.factory();
			}
			result.set(id, entry.instance);
		}
		return result;
	}

	/**
	 * Get plugins by category.
	 * @param category - Plugin category to filter by
	 */
	getByCategory(category: PluginCategory): IPlugin[] {
		const result: IPlugin[] = [];
		for (const [id] of this.plugins) {
			const plugin = this.get(id);
			if (plugin && plugin.category === category) {
				result.push(plugin);
			}
		}
		return result;
	}

	/**
	 * Get the number of registered plugins.
	 */
	get size(): number {
		return this.plugins.size;
	}

	/**
	 * Clear all registered plugins.
	 * Disposes any instantiated plugins.
	 */
	clear(): void {
		for (const entry of this.plugins.values()) {
			entry.instance?.dispose();
		}
		this.plugins.clear();
	}

	/**
	 * Reset the singleton instance.
	 * Useful for testing.
	 */
	static reset(): void {
		if (PluginRegistry.instance) {
			PluginRegistry.instance.clear();
			PluginRegistry.instance = undefined as unknown as PluginRegistry;
		}
	}
}

/**
 * Convenience function to register a plugin.
 * Plugins call this during module initialization to self-register.
 *
 * @example
 * ```typescript
 * // In src/plugins/hydra/index.ts
 * import { registerPlugin } from '../PluginRegistry';
 * import { HydraPlugin } from './HydraPlugin';
 *
 * registerPlugin('hydra', () => new HydraPlugin());
 * ```
 */
export function registerPlugin(id: string, factory: PluginFactory): void {
	PluginRegistry.getInstance().register(id, factory);
}

/**
 * Convenience function to get a plugin by ID.
 */
export function getPlugin(id: string): IPlugin | undefined {
	return PluginRegistry.getInstance().get(id);
}
