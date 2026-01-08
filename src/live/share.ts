/**
 * URL sharing via LZ-String compression
 * Supports both textmode and strudel sketches in the same URL.
 */
import LZString from 'lz-string';

const TEXTMODE_HASH_PREFIX = 'code=';
const STRUDEL_HASH_PREFIX = 'strudel=';

/**
 * Result of parsing both codes from URL hash
 */
export interface CodesFromHash {
    textmodeCode: string | null;
    strudelCode: string | null;
}

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
 * Get textmode code from URL hash if present (legacy support)
 */
export function getCodeFromHash(): string | null {
    const { textmodeCode } = getCodesFromHash();
    return textmodeCode;
}

/**
 * Get both textmode and strudel codes from URL hash if present
 */
export function getCodesFromHash(): CodesFromHash {
    const hash = window.location.hash.slice(1); // Remove #
    const result: CodesFromHash = { textmodeCode: null, strudelCode: null };

    if (!hash) return result;

    // Parse hash parameters (format: code=xxx&strudel=yyy)
    const params = hash.split('&');
    for (const param of params) {
        if (param.startsWith(TEXTMODE_HASH_PREFIX)) {
            const compressed = param.slice(TEXTMODE_HASH_PREFIX.length);
            result.textmodeCode = decodeCode(compressed);
        } else if (param.startsWith(STRUDEL_HASH_PREFIX)) {
            const compressed = param.slice(STRUDEL_HASH_PREFIX.length);
            result.strudelCode = decodeCode(compressed);
        }
    }

    return result;
}

/**
 * Update URL hash with encoded code (legacy - textmode only)
 */
export function setCodeToHash(code: string): void {
    const compressed = encodeCode(code);
    const newHash = `${TEXTMODE_HASH_PREFIX}${compressed}`;

    // Use replaceState to avoid adding to history
    history.replaceState(null, '', `#${newHash}`);
}

/**
 * Update URL hash with both textmode and strudel codes
 */
export function setCodesToHash(textmodeCode: string, strudelCode: string): void {
    const textmodeCompressed = encodeCode(textmodeCode);
    const strudelCompressed = encodeCode(strudelCode);
    const newHash = `${TEXTMODE_HASH_PREFIX}${textmodeCompressed}&${STRUDEL_HASH_PREFIX}${strudelCompressed}`;

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
 * Get shareable URL for current code (legacy - textmode only)
 */
export function getShareableUrl(code: string): string {
    const compressed = encodeCode(code);
    return `${window.location.origin}${window.location.pathname}#${TEXTMODE_HASH_PREFIX}${compressed}`;
}

/**
 * Get shareable URL for both textmode and strudel sketches
 */
export function getCombinedShareableUrl(textmodeCode: string, strudelCode: string): string {
    const textmodeCompressed = encodeCode(textmodeCode);
    const strudelCompressed = encodeCode(strudelCode);
    return `${window.location.origin}${window.location.pathname}#${TEXTMODE_HASH_PREFIX}${textmodeCompressed}&${STRUDEL_HASH_PREFIX}${strudelCompressed}`;
}
