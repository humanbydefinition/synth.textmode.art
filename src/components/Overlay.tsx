import { useState, type RefObject } from 'react';
import { StatusIndicator, type StatusState } from './StatusIndicator';
import { SystemMenu } from './SystemMenu';
import type { AppSettings } from './SettingsDialog'; // Keeping this import for the type
import { ErrorOverlay, type ErrorInfo } from './ErrorOverlay';
import { WelcomeModal } from './WelcomeModal';
import { MouseSonar, type MouseSonarHandle } from './MouseSonar';
import { cn } from '@/lib/utils';

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
    sonarRef?: RefObject<MouseSonarHandle | null>;
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
    sonarRef,
}: OverlayProps) {
    const [welcomeOpen, setWelcomeOpen] = useState(true);

    return (
        <>
            <WelcomeModal onOpenChange={setWelcomeOpen} />

            {/* Mouse Sonar - always rendered for cursor finding */}
            <MouseSonar ref={sonarRef} />

            {/* Main UI - hidden when welcome modal is open, with smooth transition */}
            <div
                className={cn(
                    "transition-opacity duration-500 ease-out",
                    welcomeOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
            >
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
            </div>
        </>
    );
}

export type { StatusState, AppSettings, ErrorInfo, MouseSonarHandle };

