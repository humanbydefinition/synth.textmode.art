import { useState, type RefObject } from 'react';

import { SystemMenu } from './SystemMenu/SystemMenu';
import { ErrorOverlay } from './ErrorOverlay';
import { WelcomeDialog } from './WelcomeDialog';
import { MouseSonar, type MouseSonarHandle } from './MouseSonar';
import { PanelTabBar } from './PanelTabBar';
import { cn } from '@/lib/utils';
import type { StatusState, AppSettings, ErrorInfo } from '@/types/app.types';

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
    // Mobile panel switching
    isMobile?: boolean;
    activePanel?: 'textmode' | 'strudel';
    onSelectPanel?: (panel: 'textmode' | 'strudel') => void;
}

export function Overlay({
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
    isMobile = false,
    activePanel = 'textmode',
    onSelectPanel,
}: OverlayProps) {

    const [welcomeOpen, setWelcomeOpen] = useState(true);

    return (
        <>
            <WelcomeDialog onOpenChange={setWelcomeOpen} />

            {/* Mouse Sonar - always rendered for cursor finding */}
            <MouseSonar ref={sonarRef} />

            {/* Mobile tab bar for panel switching */}
            {isMobile && onSelectPanel && (
                <PanelTabBar
                    activePanel={activePanel}
                    onSelectPanel={onSelectPanel}
                />
            )}

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