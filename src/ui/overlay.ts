/**
 * Error overlay and control buttons
 */

export interface ErrorInfo {
    message: string;
    stack?: string;
    line?: number;
    column?: number;
}

export interface OverlayElements {
    errorOverlay: HTMLElement;
    controls: HTMLElement;
    status: HTMLElement;
}

/**
 * Create UI overlay elements
 */
export function createOverlayElements(): OverlayElements {
    // Error overlay
    const errorOverlay = document.createElement('div');
    errorOverlay.id = 'error-overlay';
    errorOverlay.innerHTML = `
    <div class="error-title">
      <span>⚠️ Error</span>
    </div>
    <div class="error-message"></div>
    <div class="error-actions">
      <button id="error-dismiss">Dismiss</button>
      <button id="error-hard-reset">Hard Reset</button>
    </div>
  `;
    document.body.appendChild(errorOverlay);

    // Controls
    const controls = document.createElement('div');
    controls.id = 'controls';
    controls.innerHTML = `
    <button id="btn-run" title="Run (Ctrl+Enter)">▶ Run</button>
    <button id="btn-hard-reset" title="Hard Reset (Ctrl+Shift+R)">⟳ Reset</button>
    <button id="btn-share" title="Copy share link">🔗 Share</button>
  `;
    document.body.appendChild(controls);

    // Status indicator
    const status = document.createElement('div');
    status.id = 'status';
    status.textContent = 'Ready';
    document.body.appendChild(status);

    return { errorOverlay, controls, status };
}

/**
 * Error overlay controller
 */
export class ErrorOverlayController {
    private overlay: HTMLElement;
    private messageEl: HTMLElement;
    private onDismiss?: () => void;
    private onHardReset?: () => void;

    constructor(overlay: HTMLElement) {
        this.overlay = overlay;
        this.messageEl = overlay.querySelector('.error-message')!;

        // Dismiss button
        overlay.querySelector('#error-dismiss')?.addEventListener('click', () => {
            this.hide();
            this.onDismiss?.();
        });

        // Hard reset button
        overlay.querySelector('#error-hard-reset')?.addEventListener('click', () => {
            this.hide();
            this.onHardReset?.();
        });
    }

    setCallbacks(onDismiss?: () => void, onHardReset?: () => void): void {
        this.onDismiss = onDismiss;
        this.onHardReset = onHardReset;
    }

    show(error: ErrorInfo): void {
        let text = error.message;
        if (error.line !== undefined) {
            text = `Line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}: ${text}`;
        }
        if (error.stack) {
            // Show first few lines of stack
            const stackLines = error.stack.split('\n').slice(0, 4).join('\n');
            text += `\n\n${stackLines}`;
        }
        this.messageEl.textContent = text;
        this.overlay.classList.add('visible');
    }

    hide(): void {
        this.overlay.classList.remove('visible');
    }
}

/**
 * Status indicator controller
 */
export class StatusController {
    private el: HTMLElement;

    constructor(el: HTMLElement) {
        this.el = el;
    }

    setRunning(): void {
        this.el.textContent = 'Running';
        this.el.className = 'running';
    }

    setError(): void {
        this.el.textContent = 'Error';
        this.el.className = 'error';
    }

    setReady(): void {
        this.el.textContent = 'Ready';
        this.el.className = '';
    }

    setUpdated(): void {
        this.el.textContent = 'Updated';
        this.el.className = 'running';
        // Reset to running after a moment
        setTimeout(() => {
            if (this.el.textContent === 'Updated') {
                this.setRunning();
            }
        }, 1000);
    }
}

/**
 * Controls controller
 */
export class ControlsController {
    private controls: HTMLElement;
    private onRun?: () => void;
    private onHardReset?: () => void;
    private onShare?: () => void;

    constructor(controls: HTMLElement) {
        this.controls = controls;

        controls.querySelector('#btn-run')?.addEventListener('click', () => {
            this.onRun?.();
        });

        controls.querySelector('#btn-hard-reset')?.addEventListener('click', () => {
            this.onHardReset?.();
        });

        controls.querySelector('#btn-share')?.addEventListener('click', () => {
            this.onShare?.();
        });
    }

    setCallbacks(onRun?: () => void, onHardReset?: () => void, onShare?: () => void): void {
        this.onRun = onRun;
        this.onHardReset = onHardReset;
        this.onShare = onShare;
    }
}
