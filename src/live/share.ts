/**
 * URL sharing via LZ-String compression
 */
import LZString from 'lz-string';

const HASH_PREFIX = 'code=';

/**
 * Encode code to URL-safe compressed string
 */
export function encodeCode(code: string): string {
    const compressed = LZString.compressToEncodedURIComponent(code);
    return compressed;
}

/**
 * Decode code from URL-safe compressed string
 */
export function decodeCode(compressed: string): string | null {
    try {
        const code = LZString.decompressFromEncodedURIComponent(compressed);
        return code;
    } catch {
        return null;
    }
}

/**
 * Get code from URL hash if present
 */
export function getCodeFromHash(): string | null {
    const hash = window.location.hash.slice(1); // Remove #
    if (!hash.startsWith(HASH_PREFIX)) return null;

    const compressed = hash.slice(HASH_PREFIX.length);
    return decodeCode(compressed);
}

/**
 * Update URL hash with encoded code
 */
export function setCodeToHash(code: string): void {
    const compressed = encodeCode(code);
    const newHash = `${HASH_PREFIX}${compressed}`;

    // Use replaceState to avoid adding to history
    history.replaceState(null, '', `#${newHash}`);
}

/**
 * Clear hash from URL
 */
export function clearHash(): void {
    history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Get shareable URL for current code
 */
export function getShareableUrl(code: string): string {
    const compressed = encodeCode(code);
    return `${window.location.origin}${window.location.pathname}#${HASH_PREFIX}${compressed}`;
}
