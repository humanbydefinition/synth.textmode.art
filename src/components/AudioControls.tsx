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
        <div className={cn(
            "fixed top-2 left-2 z-50",
            "h-6 flex items-center p-0.5 gap-0.5", // Match h-6 (24px) of SystemMenu, minimal padding
            "rounded-full border border-white/10",
            "bg-zinc-900/40 backdrop-blur-md",
            "transition-all duration-300"
        )}>
            <button
                className={cn(
                    "h-full px-2 text-[10px] uppercase tracking-wider font-medium rounded-full transition-all flex items-center", // Uppercase for clean mini look? Or keep lowercase? User asked for lowercase.
                    // Reverting to lowercase as per previous request, but using text-[10px] for size fit
                    "lowercase",
                    activePanel === 'textmode'
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                )}
                onClick={() => onSelectPanel('textmode')}
            >
                textmode
            </button>
            <button
                className={cn(
                    "relative h-full px-2 text-[10px] lowercase font-medium rounded-full transition-all flex items-center gap-1.5",
                    activePanel === 'strudel'
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                )}
                onClick={() => onSelectPanel('strudel')}
            >
                strudel
                {isAudioPlaying && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                )}
            </button>
        </div>
    );
}
