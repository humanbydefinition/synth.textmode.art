/**
 * Monaco Editor setup for Strudel live coding
 * Shares the transparent theme with textmode.
 * 
 * Note: Strudel does not provide official TypeScript definitions.
 * We filter out semantic validation errors for the Strudel model only
 * to avoid false "undefined variable" errors for runtime-injected globals,
 * while keeping syntax validation for real errors.
 */
import * as monaco from 'monaco-editor';
import { StrudelHighlighter, injectStrudelHighlightStyles, type Pattern } from './StrudelHighlighter';

export interface StrudelMonacoOptions {
    container: HTMLElement;
    initialValue: string;
    onChange?: (value: string) => void;
    onRun?: () => void;
    onHush?: () => void;
    onToggleUI?: () => void;
    onIncreaseFontSize?: () => void;
    onDecreaseFontSize?: () => void;
    fontSize?: number;
}

export interface StrudelMonacoInstance {
    editor: monaco.editor.IStandaloneCodeEditor;
    highlighter: StrudelHighlighter;
    getValue: () => string;
    setValue: (value: string) => void;
    setMarkers: (markers: monaco.editor.IMarkerData[]) => void;
    clearMarkers: () => void;
    updateOptions: (options: monaco.editor.IEditorOptions) => void;
    /** Update the pattern for highlighting and start animation */
    setPattern: (pattern: Pattern | null, getTime: () => number, getCycle: () => number) => void;
    /** Start pattern highlighting animation loop */
    startHighlighting: () => void;
    /** Stop pattern highlighting animation loop */
    stopHighlighting: () => void;
    focus: () => void;
    dispose: () => void;
}

// Strudel model URI - used to identify and filter diagnostics
const STRUDEL_MODEL_URI = 'file:///strudel-sketch.js';

/**
 * Create Strudel-specific Monaco editor instance
 */
export function createStrudelMonacoEditor(options: StrudelMonacoOptions): StrudelMonacoInstance {
    // Create model with unique URI to avoid conflicts
    const modelUri = monaco.Uri.parse(STRUDEL_MODEL_URI);
    let model = monaco.editor.getModel(modelUri);
    if (model) {
        model.dispose();
    }
    model = monaco.editor.createModel(options.initialValue, 'javascript', modelUri);

    const editor = monaco.editor.create(options.container, {
        model,
        theme: 'transparent-dark', // Reuse the theme defined in main monaco.ts

        // Minimal chrome
        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        renderLineHighlight: 'none',
        scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            useShadows: false,
        },
        stickyScroll: {
            enabled: false,
        },

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
        links: false,
        colorDecorators: false,

        // Editor behavior
        automaticLayout: true,
        fontSize: options.fontSize ?? 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontLigatures: true,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',

        // Padding for visual breathing room
        padding: { top: 60, bottom: 80 },

        // Suggestions
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnCommitCharacter: true,

        // Cursor
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorWidth: 2,
    });

    // Add keybindings
    // Ctrl/Cmd + Enter: Run/evaluate code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        options.onRun?.();
    });

    // Ctrl/Cmd + .: Hush (stop audio) - Strudel convention
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
        options.onHush?.();
    });

    // Ctrl+Shift+H: Toggle UI visibility
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
        options.onToggleUI?.();
    });

    // Ctrl + +/=: Increase font size
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
        options.onIncreaseFontSize?.();
    });

    // Ctrl + -: Decrease font size
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
        options.onDecreaseFontSize?.();
    });

    // Listen for changes
    model.onDidChangeContent(() => {
        options.onChange?.(model.getValue());
    });

    // Filter out semantic validation errors for Strudel model
    // This prevents false "undefined variable" errors for runtime-injected globals (s, note, stack, etc.)
    // while preserving syntax errors. We listen to marker changes and keep only syntax errors.
    const markerListener = monaco.editor.onDidChangeMarkers((uris) => {
        for (const uri of uris) {
            if (uri.toString() === modelUri.toString()) {
                const allMarkers = monaco.editor.getModelMarkers({ resource: uri });
                // Filter: keep only syntax errors (code 1005, 1002, etc.) and our own 'strudel-live' markers
                // Semantic errors from TS (like "Cannot find name 'x'") have codes >= 2000
                const syntaxOnlyMarkers = allMarkers.filter(m => {
                    if (m.owner === 'strudel-live') return true;
                    if (m.owner === 'javascript') {
                        // m.code can be string, number, or {value, target}
                        const code = typeof m.code === 'number' ? m.code :
                            typeof m.code === 'string' ? parseInt(m.code, 10) :
                                typeof m.code === 'object' && m.code ? parseInt(m.code.value, 10) : 0;
                        return !isNaN(code) && code < 2000;
                    }
                    return false;
                });
                // Only update if we filtered something out
                if (syntaxOnlyMarkers.length < allMarkers.length) {
                    monaco.editor.setModelMarkers(model, 'javascript',
                        syntaxOnlyMarkers.filter(m => m.owner === 'javascript')
                    );
                }
            }
        }
    });

    // Inject global highlight animation styles
    injectStrudelHighlightStyles();

    // Create the highlighter for pattern visualization
    const highlighter = new StrudelHighlighter({
        editor,
        lookahead: 0.1,       // Query slightly ahead (in cycles)
        highlightDuration: 300, // Flash duration in ms (longer = more visible)
    });

    return {
        editor,
        highlighter,
        getValue: () => model.getValue(),
        setValue: (value: string) => model.setValue(value),
        setMarkers: (markers: monaco.editor.IMarkerData[]) => {
            monaco.editor.setModelMarkers(model, 'strudel-live', markers);
        },
        clearMarkers: () => {
            monaco.editor.setModelMarkers(model, 'strudel-live', []);
        },
        updateOptions: (opts: monaco.editor.IEditorOptions) => {
            editor.updateOptions(opts);
        },
        setPattern: (pattern: Pattern | null, getTime: () => number, getCycle: () => number) => {
            highlighter.setPattern(pattern, getTime, getCycle);
        },
        startHighlighting: () => {
            highlighter.start();
        },
        stopHighlighting: () => {
            highlighter.stop();
        },
        focus: () => {
            editor.focus();
        },
        dispose: () => {
            markerListener.dispose();
            highlighter.dispose();
            model.dispose();
            editor.dispose();
        },
    };
}

/**
 * Create error marker for Strudel errors
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
