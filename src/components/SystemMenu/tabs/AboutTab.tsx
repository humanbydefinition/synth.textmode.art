import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, ExternalLink } from 'lucide-react';

const CodebergIcon = ({ className }: { className?: string }) => (
    <svg
        role="img"
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>Codeberg</title>
        <path d="M11.955.49A12 12 0 0 0 0 12.49a12 12 0 0 0 1.832 6.373L11.838 5.766a.18.18 0 0 1 .324 0l10.006 13.097A12 12 0 0 0 11.955.49zm-.437 6.138L4.69 15.658a.22.22 0 0 0 .01.278l4.755 5.86a.22.22 0 0 0 .367-.042l2.341-4.851a.22.22 0 0 1 .403.016l1.791 4.56a.22.22 0 0 0 .385.048l2.766-4.665a.22.22 0 0 0-.02-.275l-5.322-6.425a.22.22 0 0 0-.35 0z" />
    </svg>
);

export function AboutTab() {
    const resources = [
        {
            name: "textmode.js",
            description: "core textmode library",
            url: "https://github.com/humanbydefinition/textmode.js"
        },
        {
            name: "textmode.synth.js",
            description: "synthesis extensions",
            url: "https://github.com/humanbydefinition/textmode.synth.js"
        },
        {
            name: "textmode.filters.js",
            description: "filter extensions",
            url: "https://github.com/humanbydefinition/textmode.filters.js"
        }
    ];

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900/20">
                    <div className="p-5 text-left space-y-2">
                        <h2 className="text-xl font-bold text-white">synth.textmode.art</h2>
                        <p className="text-sm text-zinc-400 max-w-[90%]">
                            a live coding environment for procedural text generation and ASCII synthesis.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5 bg-zinc-900/40">
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Version</p>
                            <p className="text-xs font-mono text-zinc-300">1.0.0-beta.1</p>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Created By</p>
                            <div className="flex items-center justify-center gap-2">
                                <img
                                    src="https://github.com/humanbydefinition.png"
                                    alt="humanbydefinition"
                                    className="w-5 h-5 rounded-full border border-white/10"
                                />
                                <a
                                    href="https://github.com/humanbydefinition"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    humanbydefinition
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Resources</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {resources.map((resource) => (
                            <a
                                key={resource.name}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {resource.url.includes("codeberg") ? (
                                            <CodebergIcon className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        ) : (
                                            <Github className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        )}
                                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{resource.name}</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                                </div>
                                <span className="text-xs text-zinc-500 group-hover:text-zinc-400">{resource.description}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
