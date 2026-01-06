/**
 * HostRuntime - manages the iframe lifecycle and communication from the parent window.
 */
import type { ParentToRunnerMessage } from './protocol';
import { isRunnerMessage } from './protocol';

export interface HostRuntimeOptions {
    /** Container element for the iframe */
    container: HTMLElement;
    /** Callback when runner is ready */
    onReady?: () => void;
    /** Callback when code runs successfully */
    onRunOk?: (timestamp: number) => void;
    /** Callback when code execution fails */
    onRunError?: (error: { message: string; stack?: string; line?: number; column?: number }) => void;
}

export class HostRuntime {
    private iframe: HTMLIFrameElement | null = null;
    private container: HTMLElement;
    private isReady = false;
    private pendingCode: string | null = null;
    private debounceTimer: number | null = null;
    private debounceMs = 300;

    private onReady?: () => void;
    private onRunOk?: (timestamp: number) => void;
    private onRunError?: (error: { message: string; stack?: string; line?: number; column?: number }) => void;

    constructor(options: HostRuntimeOptions) {
        this.container = options.container;
        this.onReady = options.onReady;
        this.onRunOk = options.onRunOk;
        this.onRunError = options.onRunError;

        // Listen for messages from iframe
        window.addEventListener('message', this.handleMessage);
    }

    /**
     * Create and initialize the iframe
     */
    init(): void {
        this.createIframe();
    }

    /**
     * Create a new iframe
     */
    private createIframe(): void {
        // Remove existing iframe if any
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }

        this.isReady = false;

        // Create new iframe
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'runner-frame';
        this.iframe.src = '/src/live/runner/runner.html';

        // Sandbox permissions: allow scripts and same-origin for imports
        this.iframe.sandbox.add('allow-scripts');
        this.iframe.sandbox.add('allow-same-origin');

        this.container.appendChild(this.iframe);
    }

    /**
     * Handle messages from iframe
     */
    private handleMessage = (event: MessageEvent): void => {
        // Only handle messages from our iframe
        if (this.iframe && event.source !== this.iframe.contentWindow) return;

        const msg = event.data;
        if (!isRunnerMessage(msg)) return;

        switch (msg.type) {
            case 'READY':
                this.isReady = true;
                this.onReady?.();
                // Run pending code if any
                if (this.pendingCode !== null) {
                    this.runCodeImmediate(this.pendingCode);
                    this.pendingCode = null;
                }
                break;

            case 'RUN_OK':
                this.onRunOk?.(msg.timestamp);
                break;

            case 'RUN_ERROR':
                this.onRunError?.({
                    message: msg.message,
                    stack: msg.stack,
                    line: msg.line,
                    column: msg.column,
                });
                break;
        }
    };

    /**
     * Send message to iframe
     */
    private sendMessage(msg: ParentToRunnerMessage): void {
        if (this.iframe?.contentWindow) {
            this.iframe.contentWindow.postMessage(msg, '*');
        }
    }

    /**
     * Run code immediately (no debounce)
     */
    private runCodeImmediate(code: string): void {
        if (!this.isReady) {
            this.pendingCode = code;
            return;
        }
        this.sendMessage({ type: 'RUN_CODE', code });
    }

    /**
     * Run code with debounce
     */
    runCode(code: string): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = window.setTimeout(() => {
            this.debounceTimer = null;
            this.runCodeImmediate(code);
        }, this.debounceMs);
    }

    /**
     * Run code immediately without debounce
     */
    forceRun(code: string): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.runCodeImmediate(code);
    }

    /**
     * Soft reset - reset frameCount to 0 and re-run code
     */
    softReset(code: string): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (!this.isReady) {
            this.pendingCode = code;
            return;
        }
        this.sendMessage({ type: 'SOFT_RESET', code });
    }

    /**
     * Set debounce delay
     */
    setDebounceMs(ms: number): void {
        this.debounceMs = ms;
    }

    /**
     * Cleanup
     */
    dispose(): void {
        window.removeEventListener('message', this.handleMessage);
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
        }
        if (this.iframe) {
            this.iframe.remove();
        }
    }
}
