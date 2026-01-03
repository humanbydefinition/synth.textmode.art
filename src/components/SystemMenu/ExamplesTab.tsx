import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play } from 'lucide-react';
import { getExamplesByCategory, categoryNames, type Example } from '@/live/examples';

export interface ExamplesTabProps {
    onLoadExample: (code: string) => void;
    onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
    const examplesByCategory = getExamplesByCategory();
    const categories = ['basic', 'effects', 'advanced'];

    const handleSelect = (example: Example) => {
        onLoadExample(example.code);
        onClose();
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <p className="text-sm text-zinc-400">
                    Select an example to load it into the editor. Your current code will be replaced.
                </p>

                {categories.map((category, index) => (
                    <div key={category}>
                        {index > 0 && <Separator className="bg-white/5 mb-6" />}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                                {categoryNames[category]}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {examplesByCategory[category]?.map((example) => (
                                    <button
                                        key={example.id}
                                        onClick={() => handleSelect(example)}
                                        className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group text-left w-full"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                            <Play className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                                                {example.name}
                                            </h4>
                                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 mt-1">
                                                {example.description}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
