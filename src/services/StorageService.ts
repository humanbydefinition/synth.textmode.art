/**
 * Storage Service - centralizes all localStorage operations.
 * Provides a clean abstraction over browser storage for code and settings persistence.
 */

import { DEFAULT_SETTINGS, type AppSettings } from '@/types/app.types';
import { getCodesFromHash } from '@/live/share';
import { defaultSketch } from '@/live/defaultSketch';
import { defaultStrudelSketch } from '@/live/defaultStrudelSketch';

// Storage keys
const TEXTMODE_CODE_KEY = 'textmode_live_code';
const STRUDEL_CODE_KEY = 'strudel_live_code';
const SETTINGS_STORAGE_KEY = 'textmode_live_settings';

/**
 * Storage service interface for dependency injection and testing.
 */
export interface IStorageService {
    /** Load textmode code from URL hash, localStorage, or default */
    loadTextmodeCode(): string;
    /** Save textmode code to localStorage */
    saveTextmodeCode(code: string): void;
    /** Load strudel code from localStorage or default */
    loadStrudelCode(): string;
    /** Save strudel code to localStorage */
    saveStrudelCode(code: string): void;
    /** Load settings from localStorage with defaults */
    loadSettings(): AppSettings;
    /** Save settings to localStorage */
    saveSettings(settings: AppSettings): void;
    /** Clear all stored code (reset to defaults) */
    clearCode(): void;
}

/**
 * Default storage service implementation using localStorage.
 */
export class StorageService implements IStorageService {
    /**
     * Load textmode code from URL hash, localStorage, or use default.
     * Priority: URL hash > localStorage > default sketch
     */
    loadTextmodeCode(): string {
        // First check URL hash for shared code
        const { textmodeCode: hashCode } = getCodesFromHash();
        if (hashCode) return hashCode;

        // Then check localStorage
        const storedCode = localStorage.getItem(TEXTMODE_CODE_KEY);
        if (storedCode) return storedCode;

        // Fall back to default
        return defaultSketch;
    }

    /**
     * Save textmode code to localStorage.
     */
    saveTextmodeCode(code: string): void {
        localStorage.setItem(TEXTMODE_CODE_KEY, code);
    }

    /**
     * Load strudel code from URL hash, localStorage, or use default.
     * Priority: URL hash > localStorage > default sketch
     */
    loadStrudelCode(): string {
        // First check URL hash for shared code
        const { strudelCode: hashCode } = getCodesFromHash();
        if (hashCode) return hashCode;

        // Then check localStorage
        const storedCode = localStorage.getItem(STRUDEL_CODE_KEY);
        if (storedCode) return storedCode;

        // Fall back to default
        return defaultStrudelSketch;
    }

    /**
     * Save strudel code to localStorage.
     */
    saveStrudelCode(code: string): void {
        localStorage.setItem(STRUDEL_CODE_KEY, code);
    }

    /**
     * Load settings from localStorage with defaults.
     * Invalid JSON is gracefully ignored.
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

    /**
     * Clear all stored code (reset to defaults).
     * Note: Does not clear settings.
     */
    clearCode(): void {
        localStorage.removeItem(TEXTMODE_CODE_KEY);
        localStorage.removeItem(STRUDEL_CODE_KEY);
    }
}

/**
 * Singleton instance for convenience.
 * In production, consider using dependency injection instead.
 */
export const storageService = new StorageService();
