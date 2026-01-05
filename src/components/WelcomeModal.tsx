import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const WELCOME_DISMISSED_KEY = 'textmode_welcome_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface WelcomeModalProps {
    onOpenChange?: (isOpen: boolean) => void;
}

export function WelcomeModal({ onOpenChange }: WelcomeModalProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const dismissedAt = localStorage.getItem(WELCOME_DISMISSED_KEY);
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const now = Date.now();
            // If less than 7 days have passed, don't show
            if (now - dismissedTime < SEVEN_DAYS_MS) {
                onOpenChange?.(false);
                return;
            }
        }
        // Show modal
        setOpen(true);
        onOpenChange?.(true);
    }, [onOpenChange]);

    const handleClose = () => {
        localStorage.setItem(WELCOME_DISMISSED_KEY, Date.now().toString());
        setOpen(false);
        onOpenChange?.(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) handleClose();
        }}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-[480px] bg-zinc-950/98 backdrop-blur-2xl border-white/10 p-0 overflow-hidden"
                overlayClassName="bg-black/90 backdrop-blur-lg"
            >
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5 text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1">
                            <DialogTitle className="text-l font-bold tracking-tight text-white">
                                synth.textmode.art
                            </DialogTitle>
                            <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-[10px] tracking-wider uppercase relative -top-2">
                                Beta
                            </Badge>
                        </div>
                        <DialogClose
                            onClick={handleClose}
                            className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                        >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Close</span>
                        </DialogClose>
                    </div>
                    <DialogDescription className="text-sm text-zinc-400">
                        a live coding environment for creating real-time visuals with textmode.js
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-5">
                    {/* Photosensitivity Warning */}
                    <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-amber-300">
                                photosensitivity warning
                            </h4>
                            <p className="text-xs text-amber-200/70 leading-relaxed">
                                this application displays rapidly changing visual patterns, flashing lights, and strobing effects
                                that may potentially trigger seizures in individuals with photosensitive epilepsy or other
                                photosensitivity conditions. viewer discretion is advised.
                            </p>
                        </div>
                    </div>

                    {/* Quick tips */}
                    <div className="text-xs text-zinc-500 space-y-1.5">
                        <p>
                            <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Enter</span>
                            {' '}to run your code
                        </p>
                        <p>
                            <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Shift+R</span>
                            {' '}to reset the sketch
                        </p>
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 text-sm text-zinc-300 hover:text-white transition-all"
                    >
                        continue
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
