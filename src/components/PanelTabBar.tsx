/**
 * Audio controls component for Strudel playback
 * Audio is automatically initialized on first user interaction
 */
import { cn } from '@/lib/utils';

/**
 * Mobile tab bar for switching between textmode and Strudel panels
 */
export interface PanelTabBarProps {
    activePanel: 'textmode' | 'strudel';
    onSelectPanel: (panel: 'textmode' | 'strudel') => void;
}

export function PanelTabBar({
    activePanel,
    onSelectPanel,
}: PanelTabBarProps) {
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
            </button>
        </div>
    );
}
