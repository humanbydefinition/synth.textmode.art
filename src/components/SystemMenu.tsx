import { useState } from 'react';
import { Menu, Heart, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { AppSettings } from './SettingsDialog';
import { PreferencesTab } from './SystemMenu/PreferencesTab';
import { AboutTab } from './SystemMenu/AboutTab';
import { LegalTab } from './SystemMenu/LegalTab';
import { ShortcutsTab } from './SystemMenu/ShortcutsTab';
import { ExamplesTab } from './SystemMenu/ExamplesTab';

export interface SystemMenuProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onShare: () => void;
    onClearStorage: () => void;
    onLoadExample: (code: string) => void;
}

export function SystemMenu({
    settings,
    onSettingsChange,
    onShare,
    onClearStorage,
    onLoadExample,
}: SystemMenuProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className={cn(
                        'fixed top-2 right-2 z-50',
                        'flex items-center justify-center',
                        'w-6 h-6 rounded-full',
                        'bg-zinc-900/40 backdrop-blur-md',
                        'border border-white/5',
                        'text-zinc-400',
                        'transition-all duration-300',
                        'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-white/10'
                    )}
                    aria-label="System Menu"
                >
                    <Menu className="w-[14px] h-[14px]" />
                </button>
            </DialogTrigger>

            <DialogContent showCloseButton={false} className="sm:max-w-[600px] h-[85vh] sm:h-[600px] bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-0 overflow-hidden flex flex-col">
                <DialogDescription className="sr-only">
                    System Menu containing settings, shortcuts, about information, and legal documents.
                </DialogDescription>
                <DialogHeader className="px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-1">
                            <DialogTitle className="text-l font-bold tracking-tight text-white flex items-center gap-2">
                                synth.textmode.art
                            </DialogTitle>
                            <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-[10px] tracking-wider uppercase relative -top-2">
                                Beta
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href="https://code.textmode.art/docs/support"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-all"
                                    >
                                        <Heart className="w-4 h-4" />
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>support this project</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href="https://discord.gg/sjrw8QXNks"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                                    >
                                        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current">
                                            <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                                        </svg>
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>join our discord</p>
                                </TooltipContent>
                            </Tooltip>
                            <DialogClose className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                                <X className="w-4 h-4" />
                                <span className="sr-only">Close</span>
                            </DialogClose>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="settings" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2 shrink-0 relative">
                        {/* Scroll indicator gradient on the right */}
                        <div className="absolute right-6 top-2 bottom-0 w-8 bg-gradient-to-l from-zinc-950/80 to-transparent pointer-events-none z-10 sm:hidden" />
                        <TabsList className="flex w-full bg-zinc-900/50 p-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                            <TabsTrigger value="settings" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">settings</TabsTrigger>
                            <TabsTrigger value="examples" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">examples</TabsTrigger>
                            <TabsTrigger value="shortcuts" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">controls</TabsTrigger>
                            <TabsTrigger value="about" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">about</TabsTrigger>
                            <TabsTrigger value="legal" className="flex-shrink-0 snap-start data-[state=active]:bg-zinc-800 data-[state=active]:text-white px-4">legal</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="settings" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <PreferencesTab
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                            onShare={onShare}
                            onClearStorage={onClearStorage}
                            onClose={() => setOpen(false)}
                        />
                    </TabsContent>

                    <TabsContent value="examples" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <ExamplesTab onLoadExample={onLoadExample} onClose={() => setOpen(false)} />
                    </TabsContent>

                    <TabsContent value="shortcuts" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <ShortcutsTab />
                    </TabsContent>

                    <TabsContent value="about" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <AboutTab />
                    </TabsContent>

                    <TabsContent value="legal" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                        <LegalTab />
                    </TabsContent>
                </Tabs>

                {/* Footer - Global, anchored to bottom */}
                <div className="p-4 border-t border-white/5 bg-zinc-950/50 shrink-0">
                    <p className="text-xs text-zinc-500 text-center">
                        <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Enter</span> to run
                        <span className="mx-2">•</span>
                        <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Ctrl+Shift+R</span> to reset
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
