/**
 * TextmodeManager - manages the textmode.js instance lifecycle.
 * Handles initialization, resize, layer cleanup, and loop control.
 */
import { textmode } from 'textmode.js';
import { SynthPlugin } from 'textmode.synth.js';
import { createFiltersPlugin } from 'textmode.filters.js';
import type { TextmodeInstance, ITextmodeManager, SynthLayer } from '../types';

/**
 * Manages the textmode instance lifecycle
 */
export class TextmodeManager implements ITextmodeManager {
    private instance: TextmodeInstance | null = null;

    /**
     * Get the textmode instance
     */
    getInstance(): TextmodeInstance | null {
        return this.instance;
    }

    /**
     * Initialize textmode and attach to DOM
     */
    init(): void {
        if (this.instance) return;

        this.instance = textmode.create({
            width: window.innerWidth,
            height: window.innerHeight,
            plugins: [SynthPlugin, createFiltersPlugin()],
        });

        document.body.appendChild(this.instance.canvas);

        // Handle resize
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Pause the animation loop
     */
    pause(): void {
        this.instance?.noLoop();
    }

    /**
     * Resume the animation loop
     */
    resume(): void {
        this.instance?.loop();
    }

    /**
     * Check if currently rendering a frame
     */
    isRendering(): boolean {
        return this.instance?.isRenderingFrame ?? false;
    }

    /**
     * Clean up layers before new execution
     */
    cleanupLayers(isSoftReset: boolean): void {
        if (!this.instance) return;

        try {
            // Clear base layer's draw callback to prevent stale references
            this.instance.layers.base.draw(() => { });

            // Clear draw callbacks on all user layers
            this.instance.layers.all.forEach(layer => {
                layer.draw(() => { });
            });

            this.instance.layers.clear();

            // For soft reset, also reset frame count
            if (isSoftReset) {
                this.instance.frameCount = 0;
                this.instance.secs = 0;

                // Clear synth on all layers
                this.clearSynth(this.instance.layers.base);
                this.instance.layers.all.forEach(layer => {
                    this.clearSynth(layer);
                });
            }
        } catch (e) {
            console.warn('Error during layer cleanup:', e);
        }
    }

    /**
     * Clear synth on a layer (added by SynthPlugin)
     */
    private clearSynth(layer: unknown): void {
        const synthLayer = layer as SynthLayer;
        if (typeof synthLayer.clearSynth === 'function') {
            synthLayer.clearSynth();
        }
    }

    /**
     * Create a safe proxy for the textmode instance
     * This is a pass-through; actual proxy creation is delegated to SafeProxyFactory
     */
    createSafeProxy(): TextmodeInstance | null {
        return this.instance;
    }

    /**
     * Handle window resize
     */
    private handleResize = (): void => {
        if (this.instance) {
            this.instance.resizeCanvas(window.innerWidth, window.innerHeight);
        }
    };

    /**
     * Dispose resources
     */
    dispose(): void {
        window.removeEventListener('resize', this.handleResize);
        // Note: textmode doesn't have a dispose method currently
    }
}
