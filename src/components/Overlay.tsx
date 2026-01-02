import { StatusIndicator, type StatusState } from './StatusIndicator';
import { SettingsDialog, type AppSettings } from './SettingsDialog';
import { ErrorOverlay, type ErrorInfo } from './ErrorOverlay';

interface OverlayProps {
    status: StatusState;
    settings: AppSettings;
    error: ErrorInfo | null;
    hasLastWorking: boolean;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
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
    onDismissError,
    onRevertToLastWorking,
}: OverlayProps) {
    return (
        <>
            <SettingsDialog
                settings={settings}
                onSettingsChange={onSettingsChange}
                onShare={onShare}
                onClearStorage={onClearStorage}
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
