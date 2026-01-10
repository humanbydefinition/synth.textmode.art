/**
 * Live coding environment - public exports
 */

// Host runtime (used by parent window)
export { HostRuntime } from './hostRuntime';
export type { HostRuntimeOptions } from './types/runtime.types';

// Strudel runtime (audio)
export { StrudelRuntime } from './strudel';
export type { StrudelRuntimeOptions, StrudelError } from './strudel';

// Types
export type {
    RuntimeError,
    IHostRuntime,
    IRuntimeEvents,
    IScopeTracker,
} from './types';

// Content
export { defaultSketch } from './defaultSketch';
export { defaultStrudelSketch } from './defaultStrudelSketch';
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
