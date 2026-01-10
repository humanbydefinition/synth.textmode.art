import * as monaco from 'monaco-editor';
import { defineTransparentTheme } from '../config/monacoTheme';
import { type IEditor, type EditorOptions } from './IEditor';

/**
 * Base class for Monaco-based editors.
 * Handles common setup, lifecycle, and features.
 */
export abstract class BaseMonacoEditor implements IEditor {
    readonly editor: monaco.editor.IStandaloneCodeEditor;
    protected model: monaco.editor.ITextModel;
    protected disposables: monaco.IDisposable[] = [];

    protected options: EditorOptions;

    constructor(options: EditorOptions) {
        this.options = options;
        // Ensure theme is defined
        defineTransparentTheme();

        // Create model
        this.model = this.createModel(options.initialValue);

        // Create editor
        this.editor = monaco.editor.create(options.container, {
            model: this.model,
            theme: 'transparent-dark',
            ...this.getCommonEditorOptions(),
            readOnly: options.readOnly,
        });

        // Setup base subscriptions
        this.setupBaseSubscriptions();

        // Register common keybindings
        this.registerCommonKeybindings();
    }

    /**
     * Create the Monaco model. Subclasses can override to provide specific URI or language.
     */
    protected createModel(value: string): monaco.editor.ITextModel {
        return monaco.editor.createModel(value, this.getLanguageId());
    }

    /**
     * Get the language ID for this editor.
     */
    protected abstract getLanguageId(): string;

    /**
     * Get common editor options.
     */
    protected getCommonEditorOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
        const showLineNumbers = this.options.lineNumbers ?? false;

        return {
            // Minimal chrome
            minimap: { enabled: false },
            lineNumbers: showLineNumbers ? 'on' : 'off',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: showLineNumbers ? 16 : 0,
            lineNumbersMinChars: showLineNumbers ? 2 : 0,
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: 'none',
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                useShadows: false,
            },
            stickyScroll: { enabled: false },

            // Disable visual guides and artifacts
            guides: {
                indentation: false,
                bracketPairs: false,
                highlightActiveIndentation: false,
                bracketPairsHorizontal: false,
            },
            renderWhitespace: 'none',
            renderControlCharacters: false,
            renderLineHighlightOnlyWhenFocus: true,
            matchBrackets: 'never',
            occurrencesHighlight: 'off',
            selectionHighlight: false,
            links: true,
            colorDecorators: false,

            // Editor behavior
            automaticLayout: true,
            fontSize: this.options.fontSize ?? 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',

            // Padding
            padding: { top: 60, bottom: 80 },

            // Suggestions
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,

            // Cursor
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            cursorWidth: 2,
        };
    }

    /**
     * Setup base event subscriptions.
     */
    protected setupBaseSubscriptions(): void {
        const changeDisposable = this.model.onDidChangeContent(() => {
            this.options.onChange?.(this.model.getValue());
        });
        this.disposables.push(changeDisposable);
    }

    /**
     * Register common keybindings found in all editors.
     */
    protected registerCommonKeybindings(): void {
        // Ctrl+Shift+H: Toggle UI visibility
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
            this.options.onToggleUI?.();
        });

        // Ctrl + +/=: Increase font size
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
            this.options.onIncreaseFontSize?.();
        });

        // Ctrl + -: Decrease font size
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
            this.options.onDecreaseFontSize?.();
        });
    }

    // --- IEditor Implementation ---

    public getValue(): string {
        return this.model.getValue();
    }

    public setValue(value: string): void {
        this.model.setValue(value);
    }

    public focus(): void {
        this.editor.focus();
    }

    public layout(): void {
        this.editor.layout();
    }

    public updateOptions(options: monaco.editor.IEditorOptions): void {
        this.editor.updateOptions(options);
    }

    public setMarkers(markers: monaco.editor.IMarkerData[]): void {
        monaco.editor.setModelMarkers(this.model, this.getMarkerOwner(), markers);
    }

    public clearMarkers(): void {
        monaco.editor.setModelMarkers(this.model, this.getMarkerOwner(), []);
    }

    /**
     * Get the owner string for markers.
     */
    protected abstract getMarkerOwner(): string;

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.model.dispose();
        this.editor.dispose();
    }
}
