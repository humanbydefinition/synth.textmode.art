import { useState, useRef, useEffect } from 'react';
import { Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type StatusState = 'ready' | 'running' | 'error' | 'updated';

interface StatusIndicatorProps {
    status: StatusState;
    className?: string;
}

const statusConfig = {
    ready: {
        icon: CheckCircle2,
        color: 'text-zinc-500',
        bgColor: 'bg-zinc-500/20',
        animate: false,
        label: 'ready',
        description: 'waiting for code changes',
    },
    running: {
        icon: Play,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        animate: false,
        label: 'running',
        description: 'sketch is running',
    },
    updated: {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        animate: false,
        label: 'updated',
        description: 'code executed successfully',
    },
    error: {
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        animate: true,
        label: 'error',
        description: 'execution failed',
    },
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
    const config = statusConfig[status];
    const Icon = config.icon;
    const [isOpen, setIsOpen] = useState(false);
    const closeTimeoutRef = useRef<number | null>(null);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 150);
    };

    // Touch support: toggle on tap
    const handleClick = (e: React.MouseEvent) => {
        // Check if this is a touch event (pointerType would be 'touch')
        const nativeEvent = e.nativeEvent as PointerEvent;
        if (nativeEvent.pointerType === 'touch') {
            setIsOpen((prev) => !prev);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        'fixed bottom-2 right-2 z-50',
                        'flex items-center justify-center',
                        'w-6 h-6 rounded-full',
                        'backdrop-blur-md border border-white/10',
                        'transition-all duration-300',
                        'hover:scale-110 hover:border-white/20',
                        'focus:outline-none focus:ring-2 focus:ring-white/20',
                        config.bgColor,
                        className
                    )}
                    aria-label={`Status: ${config.label}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                >
                    <Icon
                        className={cn(
                            'w-[14px] h-[14px] transition-colors duration-300',
                            config.color,
                            config.animate && 'animate-pulse'
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="end"
                className="w-56 p-3 bg-zinc-950/95 backdrop-blur-xl border-white/10"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full',
                            config.bgColor
                        )}
                    >
                        <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{config.label}</p>
                        <p className="text-xs text-zinc-500">{config.description}</p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
