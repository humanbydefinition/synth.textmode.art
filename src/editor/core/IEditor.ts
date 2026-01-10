import * as monaco from 'monaco-editor';

/**
 * Standard interface for all editors in the application
 */
export interface IEditor {
    /** The underlying Monaco editor instance */
    readonly editor: monaco.editor.IStandaloneCodeEditor;

    /** Get current code value */
    getValue(): string;

    /** Set code value */
    setValue(value: string): void;

    /** Focus the editor */
    focus(): void;

    /** Layout the editor (handle resize) */
    layout(): void;

    /** Update editor options */
    updateOptions(options: monaco.editor.IEditorOptions): void;

    /** Set error markers */
    setMarkers(markers: monaco.editor.IMarkerData[]): void;

    /** Clear all error markers */
    clearMarkers(): void;

    /** Dispose the editor and resources */
    dispose(): void;
}

/**
 * Configuration options shared by all editors
 */
export interface EditorOptions {
    container: HTMLElement;
    initialValue: string;
    fontSize?: number;
    lineNumbers?: boolean;
    readOnly?: boolean;
    // Common callbacks
    onChange?: (value: string) => void;
    onToggleUI?: () => void;
    onIncreaseFontSize?: () => void;
    onDecreaseFontSize?: () => void;
}
