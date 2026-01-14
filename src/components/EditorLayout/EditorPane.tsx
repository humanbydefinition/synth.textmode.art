import { useRef, useEffect } from 'react';

export interface EditorPaneProps {
    /** Unique pane identifier */
    paneId: string;
    /** Plugin ID this pane hosts */
    pluginId: string;
    /** Callback when container is ready */
    onContainerReady?: (paneId: string, container: HTMLElement) => void;
    /** Callback when container is removed */
    onContainerRemoved?: (paneId: string) => void;
    /** Whether to apply editor backdrop effect */
    hasBackdrop?: boolean;
    /** Additional class name */
    className?: string;
}

/**
 * EditorPane component - provides a container for Monaco editors.
 */
export function EditorPane({
    paneId,
    pluginId,
    onContainerReady,
    onContainerRemoved,
    hasBackdrop = false,
    className = '',
}: EditorPaneProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Notify parent when container is ready
    useEffect(() => {
        if (containerRef.current) {
            onContainerReady?.(paneId, containerRef.current);
        }

        return () => {
            onContainerRemoved?.(paneId);
        };
    }, [paneId, onContainerReady, onContainerRemoved]);

    return (
        <div
            ref={containerRef}
            id={`plugin-panel-${paneId}`}
            data-plugin-id={pluginId}
            className={`layout-pane panel-editor ${hasBackdrop ? 'editor-backdrop' : ''} ${className}`}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
            }}
        />
    );
}
