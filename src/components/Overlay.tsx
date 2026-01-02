import { StatusIndicator, type StatusState } from './StatusIndicator';
import { SettingsDialog, type AppSettings } from './SettingsDialog';
import { ErrorOverlay, type ErrorInfo } from './ErrorOverlay';

interface OverlayProps {
    status: StatusState;
    settings: AppSettings;
    error: ErrorInfo | null;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
    onDismissError: () => void;
    onHardReset: () => void;
}

export function Overlay({
    status,
    settings,
    error,
    onSettingsChange,
    onShare,
    onClearStorage,
    onDismissError,
    onHardReset,
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
                onDismiss={onDismissError}
                onHardReset={onHardReset}
            />
        </>
    );
}

export type { StatusState, AppSettings, ErrorInfo };
