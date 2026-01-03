import { useState } from 'react';
import { Copy, Check, Trash2, Zap, ZapOff, Type, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { AppSettings } from '../SettingsDialog';

export interface PreferencesTabProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
    onClose: () => void;
}

export function PreferencesTab({
    settings,
    onSettingsChange,
    onShare,
    onClearStorage,
    onClose
}: PreferencesTabProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        onShare();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Preferences</h3>

                    {/* Auto Execute Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400">
                                {settings.autoExecute ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                            </div>
                            <div>
                                <Label htmlFor="auto-execute" className="text-sm font-medium text-white cursor-pointer block">auto execute</Label>
                                <p className="text-xs text-zinc-500">run code automatically on changes</p>
                            </div>
                        </div>
                        <Switch
                            id="auto-execute"
                            checked={settings.autoExecute}
                            onCheckedChange={(checked) => onSettingsChange({ ...settings, autoExecute: checked })}
                        />
                    </div>

                    {/* Text Background Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400">
                                <Type className="w-4 h-4" />
                            </div>
                            <div>
                                <Label htmlFor="glass-effect" className="text-sm font-medium text-white cursor-pointer block">text background</Label>
                                <p className="text-xs text-zinc-500">dark backdrop behind code text</p>
                            </div>
                        </div>
                        <Switch
                            id="glass-effect"
                            checked={settings.glassEffect}
                            onCheckedChange={(checked) => onSettingsChange({ ...settings, glassEffect: checked })}
                        />
                    </div>

                    {/* Font Size Control */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <Monitor className="w-4 h-4" />
                            </div>
                            <div>
                                <Label htmlFor="font-size" className="text-sm font-medium text-white block">font size</Label>
                                <p className="text-xs text-zinc-500">editor text size ({settings.fontSize}px)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500 font-mono">10</span>
                            <input
                                id="font-size"
                                type="range"
                                min="10"
                                max="32"
                                step="1"
                                value={settings.fontSize}
                                onChange={(e) => onSettingsChange({ ...settings, fontSize: parseInt(e.target.value) })}
                                className="w-32 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            />
                            <span className="text-xs text-zinc-500 font-mono">32</span>
                        </div>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Storage</h3>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1 justify-center gap-2 bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-400"
                            onClick={handleShare}
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            {copied ? "copied!" : "copy link"}
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1 justify-center gap-2 bg-red-950/30 border-red-900/50 hover:bg-red-900/50 text-red-400"
                            onClick={() => {
                                onClearStorage();
                                onClose();
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                            reset code
                        </Button>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
