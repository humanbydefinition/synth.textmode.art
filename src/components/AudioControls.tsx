/**
 * Audio controls component for Strudel playback
 * Audio is automatically initialized on first user interaction
 */
import { Play, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudioControlsProps {
    isPlaying: boolean;
    onPlay: () => void;
    onHush: () => void;
    className?: string;
}

export function AudioControls({
    isPlaying,
    onPlay,
    onHush,
    className,
}: AudioControlsProps) {
    // Audio initializes automatically on first user interaction
    // Just show the play/stop controls (they'll work once audio is ready)
    return (
        <div className={cn('audio-controls', className)}>
            {isPlaying ? (
                <button
                    onClick={onHush}
                    className="playing"
                    title="Stop audio (Ctrl+.)"
                    aria-label="Stop audio"
                >
                    <Square className="w-4 h-4" />
                </button>
            ) : (
                <button
                    onClick={onPlay}
                    title="Play audio (Ctrl+Enter)"
                    aria-label="Play audio"
                >
                    <Play className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

/**
 * Mobile tab bar for switching between textmode and Strudel panels
 */
export interface MobileTabBarProps {
    activePanel: 'textmode' | 'strudel';
    isAudioPlaying: boolean;
    onSelectPanel: (panel: 'textmode' | 'strudel') => void;
}

export function MobileTabBar({
    activePanel,
    isAudioPlaying,
    onSelectPanel,
}: MobileTabBarProps) {
    return (
        <div className="mobile-tab-bar">
            <button
                className={cn(activePanel === 'textmode' && 'active')}
                onClick={() => onSelectPanel('textmode')}
            >
                <span>📺</span>
                <span>Visuals</span>
            </button>
            <button
                className={cn(activePanel === 'strudel' && 'active')}
                onClick={() => onSelectPanel('strudel')}
            >
                <span>🎵</span>
                <span>Audio</span>
                {isAudioPlaying && <span className="audio-indicator" />}
            </button>
        </div>
    );
}
