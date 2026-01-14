import React from 'react';

const AGPL_TEXT = "AGPL ".repeat(20);

export const MaintenancePage = () => {
    return (
        <div className="relative w-full h-full min-h-screen bg-[#030303] text-white overflow-hidden font-mono pointer-events-auto flex items-center justify-center">

            {/* Background Layer */}
            <div className="absolute inset-0 flex flex-col justify-between leading-none select-none pointer-events-none z-0 overflow-hidden py-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="whitespace-nowrap text-[12vh] font-black text-[#1c1c1c] w-[200%]"
                        style={{
                            transform: 'translateZ(0)',
                            animation: `marquee-${i % 2 ? 'left' : 'right'} ${60 + (i * 5)}s linear infinite`
                        }}
                    >
                        {AGPL_TEXT}
                    </div>
                ))}
            </div>

            {/* Content Layer */}
            <div className="relative z-10 text-center">
                <p className="text-3xl font-bold lowercase tracking-tight text-zinc-100">maintenance mode</p>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-6 z-20">
                <p className="text-zinc-800 text-sm lowercase select-none">// thanks yaxu</p>
            </div>

            <style>{`
                @keyframes marquee-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marquee-right {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};
