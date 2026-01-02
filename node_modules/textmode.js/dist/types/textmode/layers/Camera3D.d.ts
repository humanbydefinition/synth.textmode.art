/**
 * A 3D camera/transform controller for the voxel raymarching system.
 *
 * This class encapsulates the 3D transformation state (rotation, translation, zoom)
 * used when rendering layers in 3D mode. It provides a clean separation between
 * camera/viewport concerns and layer management.
 *
 * The camera operates in a right-handed coordinate system where:
 * - X axis points right
 * - Y axis points up
 * - Z axis points toward the viewer (out of the screen)
 *
 * @example
 * ```ts
 * const camera = new Camera3D();
 *
 * // Set rotation (degrees)
 * camera.rotation(45, 30, 0);
 *
 * // Get current rotation
 * const [rx, ry, rz] = camera.rotation();
 *
 * // Animate
 * camera.rotateY(camera.rotation()[1] + 1);
 *
 * // Reset to defaults
 * camera.reset();
 * ```
 */
export declare class Camera3D {
    private _rotation;
    private _translation;
    private _zoom;
    private _rotationMatrixCache;
    /**
     * Create a new Camera3D with default values.
     *
     * @param options Initial camera configuration
     */
    constructor(options?: Camera3DOptions);
    /**
     * Set or get the rotation angles in degrees.
     *
     * When called with arguments, sets the rotation and returns void.
     * When called without arguments, returns the current rotation.
     *
     * @param x Rotation around X axis in degrees
     * @param y Rotation around Y axis in degrees (defaults to 0 if x provided)
     * @param z Rotation around Z axis in degrees (defaults to 0 if x provided)
     * @returns Current rotation as [x, y, z] tuple if no arguments provided
     *
     * @example
     * ```ts
     * camera.rotation(45, 30, 0);     // Set rotation
     * const rot = camera.rotation();  // Get [45, 30, 0]
     * ```
     */
    rotation(x?: number, y?: number, z?: number): [number, number, number] | void;
    /**
     * Set or get rotation around the X axis only.
     *
     * @param degrees Rotation in degrees, or undefined to get current value
     * @returns Current X rotation if no argument provided
     */
    rotateX(degrees?: number): number | void;
    /**
     * Set or get rotation around the Y axis only.
     *
     * @param degrees Rotation in degrees, or undefined to get current value
     * @returns Current Y rotation if no argument provided
     */
    rotateY(degrees?: number): number | void;
    /**
     * Set or get rotation around the Z axis only.
     *
     * @param degrees Rotation in degrees, or undefined to get current value
     * @returns Current Z rotation if no argument provided
     */
    rotateZ(degrees?: number): number | void;
    /**
     * Set or get the translation offset in world units.
     *
     * @param x Translation along X axis
     * @param y Translation along Y axis (defaults to 0 if x provided)
     * @param z Translation along Z axis (defaults to 0 if x provided)
     * @returns Current translation as [x, y, z] tuple if no arguments provided
     *
     * @example
     * ```ts
     * camera.translation(10, 5, 0);       // Set translation
     * const pos = camera.translation();   // Get [10, 5, 0]
     * ```
     */
    translation(x?: number, y?: number, z?: number): [number, number, number] | void;
    /**
     * Set or get translation along the X axis only.
     *
     * @param units Translation amount, or undefined to get current value
     * @returns Current X translation if no argument provided
     */
    translateX(units?: number): number | void;
    /**
     * Set or get translation along the Y axis only.
     *
     * @param units Translation amount, or undefined to get current value
     * @returns Current Y translation if no argument provided
     */
    translateY(units?: number): number | void;
    /**
     * Set or get translation along the Z axis only.
     *
     * @param units Translation amount, or undefined to get current value
     * @returns Current Z translation if no argument provided
     */
    translateZ(units?: number): number | void;
    /**
     * Set or get the zoom level.
     *
     * Values greater than 1 zoom in, values less than 1 zoom out.
     * The minimum zoom level is 0.001 to prevent division by zero.
     *
     * @param factor Zoom factor (1 = no zoom)
     * @returns Current zoom if no argument provided
     *
     * @example
     * ```ts
     * camera.zoom(2);              // Zoom in 2x
     * const z = camera.zoom();     // Get 2
     * camera.zoom(0.5);            // Zoom out 50%
     * ```
     */
    zoom(factor?: number): number | void;
    /**
     * Reset the camera to default values.
     *
     * - Rotation: [0, 0, 0]
     * - Translation: [0, 0, 0]
     * - Zoom: 1
     */
    reset(): void;
    /**
     * Copy values from another Camera3D instance.
     *
     * @param other The camera to copy from
     */
    copyFrom(other: Camera3D): void;
    /**
     * Create a clone of this camera.
     *
     * @returns A new Camera3D instance with the same values
     */
    clone(): Camera3D;
    /**
     * Get the rotation matrix as a Float32Array for GPU upload.
     *
     * The matrix is computed from the current Euler angles and transposed
     * (inverted) for use in the shader. The result is cached and only
     * recomputed when rotation values change.
     *
     * @returns Transposed 3x3 rotation matrix as Float32Array
     */
    getRotationMatrix(): Float32Array;
    /**
     * Get all transform parameters in a format ready for shader uniforms.
     *
     * @returns Object containing all transform data for GPU upload
     */
    getShaderUniforms(): Camera3DShaderUniforms;
    /**
     * Invalidate the cached rotation matrix.
     * Called whenever rotation values change.
     */
    private _invalidateRotationCache;
}
/**
 * Options for creating a new Camera3D instance.
 */
export interface Camera3DOptions {
    /**
     * Initial rotation in degrees around X, Y, Z axes.
     * @default [0, 0, 0]
     */
    rotation?: [number, number, number];
    /**
     * Initial translation offset in world units.
     * @default [0, 0, 0]
     */
    translation?: [number, number, number];
    /**
     * Initial zoom factor. Values > 1 zoom in, < 1 zoom out.
     * @default 1
     */
    zoom?: number;
}
/**
 * Shader uniforms generated by Camera3D for GPU upload.
 */
export interface Camera3DShaderUniforms {
    /** Transposed 3x3 rotation matrix */
    rotation: Float32Array;
    /** Translation offset [x, y, z] */
    translation: [number, number, number];
    /** Zoom factor */
    zoom: number;
}
