import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play } from 'lucide-react';
import { PluginRegistry, type IPlugin, type Example } from '@/plugins';

export interface ExamplesTabProps {
    onLoadExample: (code: string, pluginId: string) => void;
    onClose: () => void;
}

export function ExamplesTab({ onLoadExample, onClose }: ExamplesTabProps) {
    const registry = PluginRegistry.getInstance();
    const plugins = Array.from(registry.getAll().values()).filter(p => {
        const examples = p.getExamples();
        return Object.keys(examples).length > 0;
    });

    const handleSelect = (example: Example, pluginId: string) => {
        onLoadExample(example.code, pluginId);
        onClose();
    };

    if (plugins.length === 0) {
        return (
            <div className="p-6 text-center text-zinc-500 italic">
                No examples available.
            </div>
        );
    }

    return (
        <Tabs defaultValue={plugins[0]?.id} className="h-full flex flex-col">
            <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/30 shrink-0">
                <TabsList className="bg-transparent p-0 h-auto gap-2 justify-start w-full overflow-x-auto scrollbar-hide">
                    {plugins.map(plugin => (
                        <TabsTrigger
                            key={plugin.id}
                            value={plugin.id}
                            className="bg-zinc-900/50 text-zinc-400 data-[state=active]:text-emerald-400 data-[state=active]:bg-emerald-500/10 data-[state=active]:shadow-none border border-white/5 data-[state=active]:border-emerald-500/20 px-3 py-1.5 h-auto text-xs font-medium uppercase tracking-wider rounded-md transition-all"
                        >
                            {plugin.displayName}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>

            {plugins.map(plugin => (
                <TabsContent key={plugin.id} value={plugin.id} className="flex-1 min-h-0 mt-0">
                    <PluginExampleList plugin={plugin} onSelect={(ex) => handleSelect(ex, plugin.id)} />
                </TabsContent>
            ))}
        </Tabs>
    );
}

function PluginExampleList({ plugin, onSelect }: { plugin: IPlugin; onSelect: (ex: Example) => void }) {
    const examplesByCategory = plugin.getExamples();
    const categories = Object.keys(examplesByCategory);

    // Simple helper to capitalize category names
    const getCategoryName = (cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1);

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <p className="text-sm text-zinc-400">
                    select an example to load into {plugin.displayName}. current code will be replaced.
                </p>

                {categories.map((category, index) => (
                    <div key={category}>
                        {index > 0 && <Separator className="bg-white/5 mb-6" />}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider pl-1 border-l-2 border-zinc-700">
                                {getCategoryName(category)}
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {examplesByCategory[category]?.map((example) => (
                                    <button
                                        key={example.id}
                                        onClick={() => onSelect(example)}
                                        className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group text-left w-full"
                                    >
                                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                            <Play className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                                                {example.name}
                                            </h4>
                                            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 mt-1 line-clamp-2">
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
