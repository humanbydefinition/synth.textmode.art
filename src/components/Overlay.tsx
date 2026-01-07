import { useState, type RefObject } from 'react';
import { StatusIndicator, type StatusState } from './StatusIndicator';
import { SystemMenu } from './SystemMenu';
import type { AppSettings } from './SettingsDialog'; // Keeping this import for the type
import { ErrorOverlay, type ErrorInfo } from './ErrorOverlay';
import { WelcomeModal } from './WelcomeModal';
import { MouseSonar, type MouseSonarHandle } from './MouseSonar';
import { MobileTabBar } from './AudioControls';
import { cn } from '@/lib/utils';

export interface AudioState {
    isPlaying: boolean;
    isInitialized: boolean;
}

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
    // Audio-related props
    audioState?: AudioState;
    onPlayAudio?: () => void;
    onHushAudio?: () => void;
    // Mobile panel switching
    isMobile?: boolean;
    activePanel?: 'textmode' | 'strudel';
    onSelectPanel?: (panel: 'textmode' | 'strudel') => void;
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
    audioState,
    onPlayAudio,
    onHushAudio,
    isMobile = false,
    activePanel = 'textmode',
    onSelectPanel,
}: OverlayProps) {
    const [welcomeOpen, setWelcomeOpen] = useState(true);

    return (
        <>
            <WelcomeModal onOpenChange={setWelcomeOpen} />

            {/* Mouse Sonar - always rendered for cursor finding */}
            <MouseSonar ref={sonarRef} />

            {/* Mobile tab bar for panel switching */}
            {isMobile && onSelectPanel && (
                <MobileTabBar
                    activePanel={activePanel}
                    isAudioPlaying={audioState?.isPlaying ?? false}
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
                <StatusIndicator 
                    status={status} 
                    isAudioPlaying={audioState?.isPlaying}
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

export type { StatusState, AppSettings, ErrorInfo, MouseSonarHandle };

