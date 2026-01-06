/**
 * SafeProxyFactory - creates proxies that wrap draw callbacks for error handling.
 * Ensures runtime errors in user draw loops don't crash the entire application.
 */
import type { TextmodeInstance, TextmodeLayer, TextmodeLayerManager } from '../types';

export interface SafeProxyOptions {
    /** Called when an error occurs in a draw callback */
    onDrawError: (error: Error) => void;
    /** Whether draw errors have occurred (to skip further draw calls) */
    hasDrawError: () => boolean;
}

/**
 * Creates proxies for textmode objects that safely wrap draw callbacks
 */
export class SafeProxyFactory {
    private options: SafeProxyOptions;

    constructor(options: SafeProxyOptions) {
        this.options = options;
    }

    /**
     * Create a proxy for the main textmode instance
     */
    createTextmodeProxy(original: TextmodeInstance): TextmodeInstance {
        return new Proxy(original, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'draw') {
                    return (callback: () => void) => target.draw(this.wrapDrawCallback(callback));
                }

                if (prop === 'layers') {
                    return this.createLayerManagerProxy(target.layers);
                }

                return value;
            }
        });
    }

    /**
     * Create a proxy for the layer manager
     */
    private createLayerManagerProxy(layers: TextmodeLayerManager): TextmodeLayerManager {
        return new Proxy(layers, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'base') {
                    return this.createLayerProxy(target.base);
                }

                if (prop === 'add') {
                    return (options?: Parameters<typeof target.add>[0]) => {
                        const layer = target.add(options);
                        return this.createLayerProxy(layer);
                    };
                }

                if (prop === 'all') {
                    return (target.all as TextmodeLayer[]).map(layer => this.createLayerProxy(layer));
                }

                return value;
            }
        });
    }

    /**
     * Create a proxy for a single layer
     */
    private createLayerProxy(layer: TextmodeLayer): TextmodeLayer {
        return new Proxy(layer, {
            get: (target, prop) => {
                const value = (target as unknown as Record<string | symbol, unknown>)[prop];

                if (prop === 'draw') {
                    return (callback: () => void) => target.draw(this.wrapDrawCallback(callback));
                }

                if (typeof value === 'function') {
                    return value.bind(target);
                }

                return value;
            }
        });
    }

    /**
     * Wrap a draw callback to catch errors without crashing
     */
    private wrapDrawCallback(callback: () => void): () => void {
        return () => {
            if (this.options.hasDrawError()) return; // Skip if in error state
            try {
                callback();
            } catch (error) {
                this.options.onDrawError(error as Error);
                // Don't crash - just freeze on last good frame
            }
        };
    }
}
