import { useState, type RefObject } from 'react';
import { StatusIndicator } from './StatusIndicator';
import { SystemMenu } from './SystemMenu';
import { ErrorOverlay } from './ErrorOverlay';
import { WelcomeModal } from './WelcomeModal';
import { MouseSonar, type MouseSonarHandle } from './MouseSonar';
import { MobileTabBar } from './AudioControls';
import { cn } from '@/lib/utils';
import type { StatusState, AppSettings, ErrorInfo, AudioState } from '@/types/app.types';

// Re-export types for backward compatibility
export type { AudioState } from '@/types/app.types';

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
    onPlayAudio: _onPlayAudio,
    onHushAudio: _onHushAudio,
    isMobile = false,
    activePanel = 'textmode',
    onSelectPanel,
}: OverlayProps) {
    // Note: _onPlayAudio and _onHushAudio are currently unused but kept for future use
    void _onPlayAudio;
    void _onHushAudio;

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

// Re-export types for backward compatibility
export type { StatusState, AppSettings, ErrorInfo } from '@/types/app.types';
export type { MouseSonarHandle } from './MouseSonar';
