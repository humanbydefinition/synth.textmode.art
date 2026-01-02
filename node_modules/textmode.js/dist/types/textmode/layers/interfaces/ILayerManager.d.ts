import type { TextmodeLayer } from '../TextmodeLayer';
import type { TextmodeLayerOptions } from '../types';
import type { TextmodeGrid } from '../../Grid';
import type { Camera3D } from '../Camera3D';
export interface ILayerManager {
    /**
     * Get all user layers as a readonly array.
     */
    readonly all: readonly TextmodeLayer[];
    /**
     * The base layer that is always rendered at the bottom of the layer stack.
     * This layer represents the main drawing content before any user layers are composited.
     */
    readonly base: TextmodeLayer;
    /**
     * The 3D camera used for voxel rendering.
     *
     * The camera provides fine-grained control over rotation, translation, and zoom
     * in 3D mode. For simple use cases, you can use the `rotation()`, `translation()`,
     * and `zoom()` methods directly on the layer manager instead.
     *
     * @example
     * ```ts
     * // Direct camera access for advanced control
     * const camera = t.layers.camera;
     * camera.rotateY(camera.rotateY() + 1);
     *
     * // Reset camera to defaults
     * t.layers.camera.reset();
     * ```
     */
    readonly camera: Camera3D;
    /**
     * Add a new layer to the manager.
     * @param options Layer configuration options.
     * @returns The newly added layer.
     */
    add(options?: TextmodeLayerOptions): TextmodeLayer;
    /**
     * Remove a layer from the manager.
     * @param layer The layer to remove.
     */
    remove(layer: TextmodeLayer): void;
    /**
     * Move a layer to a new index in the layer stack.
     * @param layer The layer to move.
     * @param newIndex The new index for the layer.
     */
    move(layer: TextmodeLayer, newIndex: number): void;
    /**
     * Swap the order of two layers if they exist in the same collection.
     * @param layerA The first layer to swap.
     * @param layerB The second layer to swap.
     */
    swap(layerA: TextmodeLayer, layerB: TextmodeLayer): void;
    /**
     * Remove all user-created layers from the manager.
     * The base layer is not affected by this operation.
     * This is useful for integration into live-coding environments where code is re-evaluated
     * and layers need to be recreated from scratch.
     */
    clear(): void;
    /**
     * Set or get the rendering mode.
     * - '2d': Traditional 2D layer compositing with ASCII conversion per layer.
     * - '3d': 3D voxel rendering with raymarching through stacked layer data.
     * @param mode The rendering mode to set.
     * @returns Current mode if no argument provided.
     */
    mode(mode?: '2d' | '3d'): '2d' | '3d';
    /**
     * Set or get the 3D rotation angles (in degrees) for voxel rendering.
     * Only applies when renderMode is '3d'.
     * @param x Rotation around X axis in degrees.
     * @param y Rotation around Y axis in degrees.
     * @param z Rotation around Z axis in degrees.
     * @returns Current rotation if no arguments provided.
     */
    rotation(x?: number, y?: number, z?: number): [number, number, number] | void;
    /**
     * Set or get the 3D translation offset for voxel rendering.
     * Only applies when renderMode is '3d'.
     * @param x Translation along X axis.
     * @param y Translation along Y axis.
     * @param z Translation along Z axis.
     * @returns Current translation if no arguments provided.
     */
    translation(x?: number, y?: number, z?: number): [number, number, number] | void;
    /**
     * Set or get the 3D zoom level for voxel rendering.
     * Only applies when renderMode is '3d'.
     * @param zoom Zoom factor (1 = no zoom, >1 = zoom in, <1 = zoom out).
     * @returns Current zoom if no argument provided.
     */
    zoom(zoom?: number): number | void;
    /**
     * Get the grid of the topmost visible layer.
     * Returns the topmost user layer's grid if any are visible, otherwise returns the base layer's grid.
     * This is useful for input managers that need to map coordinates to the layer the user sees on top.
     */
    $getTopmostGrid(): TextmodeGrid | undefined;
}
