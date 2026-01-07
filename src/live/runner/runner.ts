/**
 * Iframe runner - executes user sketch code with textmode.js and synth globals.
 * This script runs inside the sandboxed iframe.
 * 
 * This is a thin entry point that uses the modular Runner class.
 */
import { TextmodeManager } from './TextmodeManager';
import { FrameScheduler } from './FrameScheduler';
import { ExecutionContext } from './ExecutionContext';
import { ErrorReporter } from './ErrorReporter';
import type { ParentToRunnerMessage, RunnerToParentMessage } from '../protocol';

/**
 * Main runner class that orchestrates the execution environment
 */
class Runner {
    private textmode: TextmodeManager;
    private scheduler: FrameScheduler;
    private context: ExecutionContext;
    private errorReporter: ErrorReporter;

    /** Last successfully executed code - used for error recovery */
    private lastWorkingCode: string | null = null;

    constructor() {
        this.errorReporter = new ErrorReporter();
        this.textmode = new TextmodeManager();

        this.scheduler = new FrameScheduler({
            isRendering: () => this.textmode.isRendering(),
            onExecute: (code, isSoftReset) => this.executeInternal(code, isSoftReset),
        });

        this.context = new ExecutionContext({
            getTextmode: () => this.textmode.getInstance(),
            errorReporter: this.errorReporter,
        });
    }

    /** Flag to track if synth errors occurred after execution */
    private hasSynthErrors = false;

    /**
     * Initialize the runner
     */
    init(): void {
        this.setupErrorHandlers();
        this.textmode.init();

        // Set up synth error handler to capture dynamic parameter errors
        // These errors occur when user code like .colorama(() => t.secs()) fails
        // (t.secs is a getter, not a function)
        this.textmode.setupSynthErrorHandler((error) => {
            // Mark that synth errors occurred - this prevents the code from being
            // saved as "last working" since it has runtime issues
            this.hasSynthErrors = true;

            // Send synth error message to parent for display
            this.sendMessage({
                type: 'SYNTH_ERROR',
                message: error.message
            });
        });

        window.addEventListener('message', this.handleMessage);
        this.sendMessage({ type: 'READY' });
    }

    /**
     * Handle messages from parent window
     */
    private handleMessage = (event: MessageEvent<ParentToRunnerMessage>): void => {
        const msg = event.data;
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

        switch (msg.type) {
            case 'RUN_CODE':
                this.executeCode(msg.code, false);
                break;
            case 'SOFT_RESET':
                this.executeCode(msg.code, true);
                break;
        }
    };

    /**
     * Execute code with validation and frame-safe scheduling
     */
    private executeCode(code: string, isSoftReset: boolean): void {
        // Validate syntax first
        const validation = this.context.validateSyntax(code);
        if (!validation.valid) {
            this.errorReporter.report(validation.error!);
            return;
        }

        // Schedule for frame-safe execution
        this.scheduler.schedule({ code, isSoftReset });
    }

    /**
     * Internal execution (called by scheduler at safe frame boundary)
     */
    private executeInternal(code: string, isSoftReset: boolean): void {
        // Reset synth error flag before new execution
        // This will be set to true if synth errors occur during rendering
        this.hasSynthErrors = false;

        // Pause animation loop during setup
        this.textmode.pause();

        try {
            // Clean up layers first
            this.textmode.cleanupLayers(isSoftReset);

            // Execute the code
            const result = this.context.execute(code);

            if (result.success) {
                // Store as last working code for error recovery
                // Note: If synth errors occur during rendering, the parent will
                // receive SYNTH_ERROR and won't update its lastWorkingCode
                this.lastWorkingCode = code;
                this.sendMessage({ type: 'RUN_OK', timestamp: Date.now() });
            } else if (result.error) {
                this.errorReporter.report(new Error(result.error.message));

                // RESTORE: Re-execute last working code to restore state
                if (this.lastWorkingCode && this.lastWorkingCode !== code) {
                    this.restoreLastWorking();
                }
            }
        } finally {
            // Always resume animation loop
            this.textmode.resume();
        }
    }

    /**
     * Restore the last working sketch after an error
     */
    private restoreLastWorking(): void {
        if (!this.lastWorkingCode) return;

        try {
            // CRITICAL: Clear all synths first to remove any broken synth state
            // This handles cases where a synth's dynamic parameter threw an error
            // after being registered (e.g., .colorama(() => t.secs()) where t.secs is a getter)
            //this.textmode.clearAllSynths();

            // Clean up and re-execute last working code
            this.textmode.cleanupLayers(false);
            const result = this.context.execute(this.lastWorkingCode);

            if (!result.success) {
                // This shouldn't happen, but log it if it does
                console.warn('Failed to restore last working code:', result.error?.message);
            }
        } catch (e) {
            console.warn('Error during restoration:', e);
        }
    }

    /**
     * Setup global error handlers
     */
    private setupErrorHandlers(): void {
        window.addEventListener('error', (event) => {
            this.errorReporter.report(event.error || event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.errorReporter.report(event.reason);
        });
    }

    /**
     * Send message to parent window
     */
    private sendMessage(msg: RunnerToParentMessage): void {
        window.parent.postMessage(msg, '*');
    }
}

// Create and initialize runner
const runner = new Runner();

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runner.init());
} else {
    runner.init();
}
