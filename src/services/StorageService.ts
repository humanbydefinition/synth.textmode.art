import { DEFAULT_SETTINGS, type AppSettings } from '@/types/app.types';
import { PluginRegistry } from '@/plugins';

// Storage keys
const SETTINGS_STORAGE_KEY = 'app_settings';

/**
 * Get storage key for a plugin's code.
 */
function getPluginCodeKey(pluginId: string): string {
	return `${pluginId}_code`;
}

/**
 * Storage service interface.
 */
export interface IStorageService {
	/** Load plugin code from URL hash, localStorage, or default */
	loadPluginCode(pluginId: string): string;

	/** Save plugin code to localStorage */
	savePluginCode(pluginId: string, code: string): void;

	/** Clear plugin code from localStorage */
	clearPluginCode(pluginId: string): void;

	/** Clear all stored code (reset to defaults) */
	clearCode(): void;

	/** Load settings from localStorage with defaults */
	loadSettings(): AppSettings;

	/** Save settings to localStorage */
	saveSettings(settings: AppSettings): void;
}

/**
 * Storage service using localStorage.
 */
export class StorageService implements IStorageService {
	/**
	 * Load plugin code.
	 * Priority: localStorage > default sketch
	 */
	loadPluginCode(pluginId: string): string {
		// Check localStorage
		const storedCode = localStorage.getItem(getPluginCodeKey(pluginId));
		if (storedCode) return storedCode;

		return (
			PluginRegistry.getInstance().get(pluginId)?.getDefaultCode() ?? '// No default code found for this plugin'
		);
	}

	/**
	 * Save plugin code to localStorage.
	 */
	savePluginCode(pluginId: string, code: string): void {
		localStorage.setItem(getPluginCodeKey(pluginId), code);
	}

	/**
	 * Clear plugin code from localStorage.
	 */
	clearPluginCode(pluginId: string): void {
		localStorage.removeItem(getPluginCodeKey(pluginId));
	}

	/**
	 * Clear all known plugin code from localStorage.
	 */
	clearCode(): void {
		const registry = PluginRegistry.getInstance();
		registry.getAll().forEach((plugin) => {
			this.clearPluginCode(plugin.id);
		});
	}

	/**
	 * Load settings from localStorage with defaults.
	 */
	loadSettings(): AppSettings {
		try {
			const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (stored) {
				return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
			}
		} catch {
			// Ignore parse errors, return defaults
		}
		return DEFAULT_SETTINGS;
	}

	/**
	 * Save settings to localStorage.
	 */
	saveSettings(settings: AppSettings): void {
		localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	}
}

/**
 * Singleton instance.
 */
export const storageService = new StorageService();
