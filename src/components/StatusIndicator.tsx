import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    },
    running: {
        icon: Play,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        animate: false,
    },
    updated: {
        icon: CheckCircle2,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        animate: false,
    },
    error: {
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        animate: true,
    },
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'fixed bottom-2 right-2 z-50',
                'flex items-center justify-center',
                'w-6 h-6 rounded-full',
                'backdrop-blur-md border border-white/10',
                'transition-all duration-300',
                config.bgColor,
                className
            )}
        >
            <Icon
                className={cn(
                    'w-5 h-5 transition-colors duration-300',
                    config.color,
                    config.animate && 'animate-pulse'
                )}
            />
        </div>
    );
}
