import { StatusIndicator, type StatusState } from './StatusIndicator';
import { SystemMenu } from './SystemMenu';
import type { AppSettings } from './SettingsDialog'; // Keeping this import for the type
import { ErrorOverlay, type ErrorInfo } from './ErrorOverlay';

interface OverlayProps {
    status: StatusState;
    settings: AppSettings;
    error: ErrorInfo | null;
    hasLastWorking: boolean;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
    onLoadExample: (code: string) => void;
    onDismissError: () => void;
    onRevertToLastWorking: () => void;
}

export function Overlay({
    status,
    settings,
    error,
    hasLastWorking,
    onSettingsChange,
    onShare,
    onClearStorage,
    onLoadExample,
    onDismissError,
    onRevertToLastWorking,
}: OverlayProps) {
    return (
        <>
            <SystemMenu
                settings={settings}
                onSettingsChange={onSettingsChange}
                onShare={onShare}
                onClearStorage={onClearStorage}
                onLoadExample={onLoadExample}
            />
            <StatusIndicator status={status} />
            <ErrorOverlay
                error={error}
                hasLastWorking={hasLastWorking}
                onDismiss={onDismissError}
                onRevert={onRevertToLastWorking}
            />
        </>
    );
}

export type { StatusState, AppSettings, ErrorInfo };
