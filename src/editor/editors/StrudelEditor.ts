import * as monaco from 'monaco-editor';
import { BaseMonacoEditor } from '../core/BaseMonacoEditor';
import { type EditorOptions } from '../core/IEditor';
import { StrudelHighlighter, injectStrudelHighlightStyles, type Pattern } from './StrudelHighlighter';

export interface StrudelEditorOptions extends EditorOptions {
    onRun?: () => void;
    onHush?: () => void;
}

// Strudel model URI - used to identify and filter diagnostics
const STRUDEL_MODEL_URI = 'file:///strudel-sketch.js';

export class StrudelEditor extends BaseMonacoEditor {
    readonly highlighter: StrudelHighlighter;
    private markerListener: monaco.IDisposable | null = null;

    protected override options: StrudelEditorOptions;

    constructor(options: StrudelEditorOptions) {
        super(options);
        this.options = options;

        // Inject global highlight animation styles
        injectStrudelHighlightStyles();

        // Create the highlighter for pattern visualization
        this.highlighter = new StrudelHighlighter({
            editor: this.editor,
            lookahead: 0.1,
        });

        this.registerStrudelKeybindings();
        this.setupErrorFiltering();
    }

    protected getLanguageId(): string {
        return 'javascript';
    }

    protected getMarkerOwner(): string {
        return 'strudel-live';
    }

    protected createModel(value: string): monaco.editor.ITextModel {
        // Create model with unique URI to avoid conflicts
        const modelUri = monaco.Uri.parse(STRUDEL_MODEL_URI);
        let model = monaco.editor.getModel(modelUri);
        if (model) {
            model.dispose();
        }
        return monaco.editor.createModel(value, this.getLanguageId(), modelUri);
    }

    private registerStrudelKeybindings(): void {
        // Ctrl/Cmd + Enter: Run/evaluate code
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.options.onRun?.();
        });

        // Ctrl/Cmd + .: Hush (stop audio) - Strudel convention
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
            this.options.onHush?.();
        });
    }

    private setupErrorFiltering(): void {
        // Filter out semantic validation errors for Strudel model
        this.markerListener = monaco.editor.onDidChangeMarkers((uris) => {
            for (const uri of uris) {
                if (uri.toString() === this.model.uri.toString()) {
                    const allMarkers = monaco.editor.getModelMarkers({ resource: uri });

                    const syntaxOnlyMarkers = allMarkers.filter(m => {
                        if (m.owner === this.getMarkerOwner()) return true;
                        if (m.owner === 'javascript') {
                            const code = typeof m.code === 'number' ? m.code :
                                typeof m.code === 'string' ? parseInt(m.code, 10) :
                                    typeof m.code === 'object' && m.code ? parseInt(m.code.value, 10) : 0;
                            return !isNaN(code) && code < 2000;
                        }
                        return false;
                    });

                    if (syntaxOnlyMarkers.length < allMarkers.length) {
                        monaco.editor.setModelMarkers(this.model, 'javascript',
                            syntaxOnlyMarkers.filter(m => m.owner === 'javascript')
                        );
                    }
                }
            }
        });
        this.disposables.push(this.markerListener);
    }

    // --- Strudel Specific Public Methods ---

    public setPattern(pattern: Pattern | null, getTime: () => number, getCycle: () => number): void {
        this.highlighter.setPattern(pattern, getTime, getCycle);
    }

    public startHighlighting(): void {
        this.highlighter.start();
    }

    public stopHighlighting(): void {
        this.highlighter.stop();
    }

    public override dispose(): void {
        this.highlighter.dispose();
        super.dispose();
    }
}

/**
 * Helper to create error marker for Strudel errors
 */
export function createStrudelErrorMarker(
    message: string,
    line?: number,
    column?: number
): monaco.editor.IMarkerData {
    return {
        severity: monaco.MarkerSeverity.Error,
        message,
        startLineNumber: line ?? 1,
        startColumn: column ?? 1,
        endLineNumber: line ?? 1,
        endColumn: column ? column + 10 : 100,
    };
}
