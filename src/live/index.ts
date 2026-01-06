/**
 * Live coding environment - public exports
 */

// Host runtime (used by parent window)
export { HostRuntime } from './hostRuntime';
export type { HostRuntimeOptions } from './hostRuntime';

// Types
export type {
    RuntimeError,
    IHostRuntime,
    IRuntimeEvents,
    IScopeTracker,
} from './types';

// Content
export { defaultSketch } from './defaultSketch';
export { examples, getExamplesByCategory, categoryNames } from './examples';
export type { Example } from './examples';

// URL sharing
export {
    encodeCode,
    decodeCode,
    getCodeFromHash,
    setCodeToHash,
    clearHash,
    getShareableUrl
} from './share';
