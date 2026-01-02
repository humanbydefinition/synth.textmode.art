/**
 * 3x3 Matrix utilities for 3D transformations.
 *
 * All matrices are stored in row-major order as flat arrays of 9 elements:
 * ```
 * [m00, m01, m02,
 *  m10, m11, m12,
 *  m20, m21, m22]
 * ```
 *
 * @module utils/mat3
 */
/**
 * A 3x3 matrix represented as a tuple of 9 numbers in row-major order.
 */
export type Mat3 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
/**
 * Create an identity 3x3 matrix.
 *
 * @returns A new identity matrix
 *
 * @example
 * ```ts
 * const identity = mat3Identity();
 * // [1, 0, 0, 0, 1, 0, 0, 0, 1]
 * ```
 */
export declare function mat3Identity(): Mat3;
/**
 * Multiply two 3x3 matrices in row-major order.
 *
 * @param a First matrix (left operand)
 * @param b Second matrix (right operand)
 * @returns The product matrix (a × b)
 *
 * @example
 * ```ts
 * const result = mat3Multiply(rotationX, rotationY);
 * ```
 */
export declare function mat3Multiply(a: Mat3, b: Mat3): Mat3;
/**
 * Transpose a 3x3 matrix (swap rows and columns).
 *
 * For orthonormal rotation matrices, the transpose equals the inverse.
 *
 * @param m The matrix to transpose
 * @returns The transposed matrix
 *
 * @example
 * ```ts
 * const inverse = mat3Transpose(rotationMatrix);
 * ```
 */
export declare function mat3Transpose(m: Mat3): Mat3;
/**
 * Create a rotation matrix around the X axis.
 *
 * @param radians Rotation angle in radians
 * @returns Rotation matrix around X axis
 *
 * @example
 * ```ts
 * const rotX = mat3RotationX(Math.PI / 4); // 45° rotation
 * ```
 */
export declare function mat3RotationX(radians: number): Mat3;
/**
 * Create a rotation matrix around the Y axis.
 *
 * @param radians Rotation angle in radians
 * @returns Rotation matrix around Y axis
 *
 * @example
 * ```ts
 * const rotY = mat3RotationY(Math.PI / 2); // 90° rotation
 * ```
 */
export declare function mat3RotationY(radians: number): Mat3;
/**
 * Create a rotation matrix around the Z axis.
 *
 * @param radians Rotation angle in radians
 * @returns Rotation matrix around Z axis
 *
 * @example
 * ```ts
 * const rotZ = mat3RotationZ(Math.PI); // 180° rotation
 * ```
 */
export declare function mat3RotationZ(radians: number): Mat3;
/**
 * Build a combined rotation matrix from Euler angles (in radians).
 *
 * The rotation order is: Z × Y × X (applied right-to-left,
 * so X rotation is applied first to the vector).
 *
 * @param radiansX Rotation around X axis in radians
 * @param radiansY Rotation around Y axis in radians
 * @param radiansZ Rotation around Z axis in radians
 * @returns Combined rotation matrix
 *
 * @example
 * ```ts
 * import { degToRad } from './math';
 * const rotation = mat3FromEuler(
 *   degToRad(45),
 *   degToRad(30),
 *   degToRad(0)
 * );
 * ```
 */
export declare function mat3FromEuler(radiansX: number, radiansY: number, radiansZ: number): Mat3;
/**
 * Build a rotation matrix from Euler angles in degrees.
 *
 * This is a convenience function that converts degrees to radians
 * and returns the transposed (inverse) matrix, which is commonly
 * needed for shader uniforms.
 *
 * @param degX Rotation around X axis in degrees
 * @param degY Rotation around Y axis in degrees
 * @param degZ Rotation around Z axis in degrees
 * @returns Transposed rotation matrix as Float32Array (for GPU upload)
 *
 * @example
 * ```ts
 * const modelRotation = mat3FromEulerDegrees(45, 30, 0);
 * shader.setUniform('u_modelRotation', modelRotation);
 * ```
 */
export declare function mat3FromEulerDegrees(degX: number, degY: number, degZ: number): Float32Array;
/**
 * Convert a Mat3 to a Float32Array for GPU upload.
 *
 * @param m The matrix to convert
 * @returns Float32Array containing the matrix data
 */
export declare function mat3ToFloat32Array(m: Mat3): Float32Array;
