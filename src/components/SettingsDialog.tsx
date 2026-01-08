import { useState } from 'react';
import { Settings, Copy, Check, Trash2, Zap, ZapOff, Type } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AppSettings } from '@/types/app.types';

// Re-export for backward compatibility
export type { AppSettings } from '@/types/app.types';

interface SettingsDialogProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
}

export function SettingsDialog({
    settings,
    onSettingsChange,
    onShare,
    onClearStorage,
}: SettingsDialogProps) {
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);

    const handleShare = () => {
        onShare();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className={cn(
                        'fixed top-2 right-2 z-50',
                        'flex items-center justify-center',
                        'w-6 h-6 rounded-full',
                        'bg-zinc-500/20 backdrop-blur-md',
                        'border border-white/10',
                        'text-zinc-400',
                        'transition-all duration-300',
                        'hover:scale-110 hover:border-white/20 hover:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-white/20'
                    )}
                    aria-label="Settings"
                >
                    <Settings className="w-[14px] h-[14px]" />
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px] bg-zinc-950/95 backdrop-blur-2xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-white">
                        settings
                    </DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">
                        configure your live coding environment
                    </DialogDescription>
                </DialogHeader>

                {/* Settings Section */}
                <div className="space-y-3">
                    {/* Auto Execute Toggle */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400">
                                {settings.autoExecute ? (
                                    <Zap className="w-5 h-5" />
                                ) : (
                                    <ZapOff className="w-5 h-5" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="auto-execute"
                                    className="text-sm font-medium text-white cursor-pointer"
                                >
                                    auto execute
                                </Label>
                                <p className="text-xs text-zinc-500">
                                    run code automatically on changes
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="auto-execute"
                            checked={settings.autoExecute}
                            onCheckedChange={(checked) =>
                                onSettingsChange({ ...settings, autoExecute: checked })
                            }
                        />
                    </div>

                    {/* Text Background Toggle */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400">
                                <Type className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="glass-effect"
                                    className="text-sm font-medium text-white cursor-pointer"
                                >
                                    text background
                                </Label>
                                <p className="text-xs text-zinc-500">
                                    dark backdrop behind code text
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="glass-effect"
                            checked={settings.glassEffect}
                            onCheckedChange={(checked) =>
                                onSettingsChange({ ...settings, glassEffect: checked })
                            }
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800" />

                {/* Actions Section */}
                <div className="space-y-3">
                    <Button
                        variant="outline"
                        className="w-full h-11 justify-start gap-3 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300"
                        onClick={handleShare}
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400">copied to clipboard!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>copy share link</span>
                            </>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full h-11 justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                            onClearStorage();
                            setOpen(false);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>reset to default code</span>
                    </Button>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 text-center">
                        <kbd className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px]">
                            ctrl+enter
                        </kbd>
                        <span className="mx-2 text-zinc-600">run</span>
                        <kbd className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px]">
                            ctrl+shift+r
                        </kbd>
                        <span className="ml-2 text-zinc-600">reset</span>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
