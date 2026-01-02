import type { GLRenderer, GLFramebuffer } from '../../rendering';
import type { TextmodeLayer } from './TextmodeLayer';
import type { TextmodeFont } from '../loadables/font';
import type { TextmodeGrid } from '../Grid';
import type { Camera3D } from './Camera3D';
/**
 * 3D rendering options for the voxel raymarching system.
 */
export interface Layer3DOptions {
    /**
     * Camera containing rotation, translation, and zoom.
     * If provided, rotation/translation/zoom properties below are ignored.
     */
    camera?: Camera3D;
    /**
     * Index of a specific layer to render in isolation.
     * Set to -1 to render all layers.
     * @default -1
     */
    isolatedLayer?: number;
    /**
     * Custom normal vectors for each voxel face (for lighting effects).
     */
    normals?: {
        right?: [number, number, number];
        left?: [number, number, number];
        top?: [number, number, number];
        bottom?: [number, number, number];
        front?: [number, number, number];
        back?: [number, number, number];
    };
}
/**
 * Parameters for the 3D composite operation.
 */
export interface Composite3DParams {
    /** The base layer's draw framebuffer. */
    baseDrawFramebuffer: GLFramebuffer;
    /** The target framebuffer to render the final result into. */
    targetFramebuffer: GLFramebuffer;
    /** The background color as RGBA values (0-1 range). */
    backgroundColor: [number, number, number, number];
    /** The base layer configuration. */
    baseLayer: TextmodeLayer;
    /** The array of user layers to stack. */
    layers: readonly TextmodeLayer[];
    /** The font used for character texture lookup (from base layer). */
    font: TextmodeFont;
    /** The grid with the largest dimensions (cols × rows) to use as reference. */
    grid: TextmodeGrid;
    /** Canvas width in pixels. */
    canvasWidth: number;
    /** Canvas height in pixels. */
    canvasHeight: number;
    /** 3D rendering options. */
    options3D?: Layer3DOptions;
}
/**
 * Handles the compositing of multiple layers using 3D voxel raymarching.
 *
 * This class is responsible for:
 * - Combining all layer draw framebuffers into a single stacked atlas texture
 * - Rendering the stacked layers as a 3D voxel grid using raymarching
 * - Supporting rotation, zoom, and other 3D transformations
 *
 * @internal
 *
 * @remarks
 * The compositor creates a stacked texture atlas where each layer's draw data
 * is placed vertically in the texture. The 3D shader interprets this as a
 * voxel grid with depth equal to the number of layers.
 *
 * Atlas layout:
 * - Width: grid.cols
 * - Height: grid.rows * (1 + numUserLayers)
 * - Layer 0 (z=0, front): base layer at top
 * - Layer N (z=N): user layers stacked below
 */
export declare class Layer3DCompositor {
    private readonly _renderer;
    private readonly _shaderGBuffer;
    private readonly _shaderShade;
    private _stackedAsciiBuffer;
    private _stackedPrimaryBuffer;
    private _stackedSecondaryBuffer;
    private _gBuffer;
    private _currentLayerCount;
    private _canvasWidth;
    private _canvasHeight;
    private _maxCols;
    private _maxRows;
    /**
     * Create a new Layer3DCompositor.
     * @param renderer The WebGL renderer instance.
     */
    constructor(renderer: GLRenderer);
    /**
     * Initialize the compositor's framebuffers.
     * @param maxCols Maximum columns across all layers.
     * @param maxRows Maximum rows across all layers.
     * @param totalLayers Total number of layers (1 base + N user layers).
     * @ignore
     */
    $initialize(maxCols: number, maxRows: number, totalLayers?: number): void;
    /**
     * Resize the stacked atlas buffers to accommodate new dimensions.
     * @param maxCols Maximum columns across all layers.
     * @param maxRows Maximum rows across all layers.
     * @param totalLayers Total number of layers.
     * @ignore
     */
    $resize(maxCols: number, maxRows: number, totalLayers?: number): void;
    /**
     * Composite all layers into a 3D voxel render.
     * @param params The composite parameters.
     */
    $composite(params: Composite3DParams): void;
    /**
     * Build the stacked atlas by copying each layer's draw data.
     * Each layer is centered within the max dimensions.
     */
    private _buildStackedAtlas;
    /**
     * Copy a source texture into a region of the target atlas framebuffer.
     * Uses blitFramebuffer for efficient GPU-side copies.
     */
    private _copyTextureToAtlas;
    /**
     * Render the 3D voxel scene using two-pass deferred rendering.
     * Pass 1: G-Buffer generation (raymarching, outputs voxel coords + surface data)
     * Pass 2: Shading (reads G-buffer, samples textures, applies character rendering)
     */
    private _render3D;
    /**
     * Ensure the G-buffer exists and is correctly sized.
     * Uses RGBA8 textures with normalized encoding for maximum compatibility.
     */
    private _ensureGBuffer;
    /**
     * Dispose of all compositor resources.
     * @ignore
     */
    $dispose(): void;
    /**
     * Get the current maximum columns in the stacked atlas.
     */
    get $maxCols(): number;
    /**
     * Get the current maximum rows per layer in the stacked atlas.
     */
    get $maxRows(): number;
}
