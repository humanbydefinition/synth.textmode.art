/**
 * Textmode-specific type definitions.
 * These types provide better typing for textmode.js interactions.
 */

import type { textmode } from 'textmode.js';

/**
 * The textmode instance type
 */
export type TextmodeInstance = ReturnType<typeof textmode.create>;

/**
 * A single layer in textmode
 */
export type TextmodeLayer = TextmodeInstance['layers']['base'];

/**
 * The layer manager in textmode
 */
export type TextmodeLayerManager = TextmodeInstance['layers'];

/**
 * Interface for textmode instance management
 */
export interface ITextmodeManager {
    /** Get the textmode instance */
    getInstance(): TextmodeInstance | null;
    /** Initialize textmode */
    init(): void;
    /** Pause the animation loop */
    pause(): void;
    /** Resume the animation loop */
    resume(): void;
    /** Clean up layers before new execution */
    cleanupLayers(isSoftReset: boolean): void;
    /** Clear synths on all layers (base + user layers) */
    clearAllSynths(): void;
    /** Set up a handler for synth dynamic parameter errors */
    setupSynthErrorHandler(handler: (error: Error) => void): void;
    /** Create a safe proxy for the textmode instance */
    createSafeProxy(): TextmodeInstance | null;
}

/**
 * Synth clear method that textmode layers have
 * This is added by the SynthPlugin
 */
export interface SynthLayer {
    clearSynth(): void;
}
