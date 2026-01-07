import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface MouseSonarHandle {
    ping: () => void;
}

interface RingState {
    id: number;
    x: number;
    y: number;
}

/**
 * MouseSonar - A macOS-style "Find My Cursor" visual effect.
 * Renders expanding/fading concentric rings at the mouse position when triggered.
 */
export const MouseSonar = forwardRef<MouseSonarHandle>((_, ref) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [rings, setRings] = useState<RingState[]>([]);

    // Track mouse position
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Expose ping method
    const ping = useCallback(() => {
        const id = Date.now();
        setRings((prev) => [...prev, { id, x: mousePos.x, y: mousePos.y }]);

        // Remove ring after animation completes
        setTimeout(() => {
            setRings((prev) => prev.filter((r) => r.id !== id));
        }, 600);
    }, [mousePos]);

    useImperativeHandle(ref, () => ({ ping }), [ping]);

    return (
        <>
            {rings.map((ring) => (
                <div
                    key={ring.id}
                    className="mouse-sonar-ring"
                    style={{
                        left: ring.x,
                        top: ring.y,
                    }}
                />
            ))}
        </>
    );
});

MouseSonar.displayName = 'MouseSonar';
