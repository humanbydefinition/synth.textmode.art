/**
 * Message protocol for communication between parent window and iframe runner.
 */

// Messages from runner to parent
export interface ReadyMessage {
    type: 'READY';
}

export interface RunOkMessage {
    type: 'RUN_OK';
    timestamp: number;
}

export interface RunErrorMessage {
    type: 'RUN_ERROR';
    message: string;
    stack?: string;
    line?: number;
    column?: number;
}

export type RunnerToParentMessage = ReadyMessage | RunOkMessage | RunErrorMessage;

// Messages from parent to runner
export interface RunCodeMessage {
    type: 'RUN_CODE';
    code: string;
}

export interface HardResetMessage {
    type: 'HARD_RESET';
}

export type ParentToRunnerMessage = RunCodeMessage | HardResetMessage;

// Union of all messages
export type Message = RunnerToParentMessage | ParentToRunnerMessage;

/**
 * Type guard for runner-to-parent messages
 */
export function isRunnerMessage(msg: unknown): msg is RunnerToParentMessage {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as { type?: string };
    return m.type === 'READY' || m.type === 'RUN_OK' || m.type === 'RUN_ERROR';
}
