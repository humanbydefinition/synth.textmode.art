/**
 * Monaco Editor setup with transparent theme and keybindings
 */
import * as monaco from 'monaco-editor';
import { typeDefinitions } from './types';

// Import Monaco workers
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco environment for web workers
self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

export interface MonacoEditorOptions {
    container: HTMLElement;
    initialValue: string;
    onChange?: (value: string) => void;
    onRun?: () => void;
    onSoftReset?: () => void;
    onToggleUI?: () => void;
    onToggleTextBackground?: () => void;
    onToggleAutoExecute?: () => void;
    onIncreaseFontSize?: () => void;
    onDecreaseFontSize?: () => void;
    fontSize?: number;
}

export interface MonacoEditorInstance {
    editor: monaco.editor.IStandaloneCodeEditor;
    getValue: () => string;
    setValue: (value: string) => void;
    setMarkers: (markers: monaco.editor.IMarkerData[]) => void;
    clearMarkers: () => void;
    updateOptions: (options: monaco.editor.IEditorOptions) => void;
    dispose: () => void;
}

/**
 * Define transparent theme for overlay editing
 */
function defineTransparentTheme(): void {
    monaco.editor.defineTheme('transparent-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: '', foreground: 'e8e8e8' },
            { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'c586c0' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'number', foreground: 'b5cea8' },
            { token: 'type', foreground: '4ec9b0' },
            { token: 'function', foreground: 'dcdcaa' },
            { token: 'variable', foreground: '9cdcfe' },
            { token: 'constant', foreground: '4fc1ff' },
        ],
        colors: {
            'editor.background': '#00000000',
            'editor.foreground': '#e8e8e8',
            'editor.lineHighlightBackground': '#ffffff06',
            'editor.selectionBackground': '#4488ff35',
            'editor.inactiveSelectionBackground': '#4488ff18',
            'editorCursor.foreground': '#ffffff',
            'editorWhitespace.foreground': '#404040',
            'editorIndentGuide.background': '#303030',
            'editorLineNumber.foreground': '#505050',
            'editorLineNumber.activeForeground': '#808080',
            'editorGutter.background': '#00000000',
            'editorWidget.background': '#1a1a24ee',
            'editorWidget.border': '#3a3a50',
            'editorSuggestWidget.background': '#1a1a24f5',
            'editorSuggestWidget.border': '#3a3a50',
            'editorSuggestWidget.selectedBackground': '#3a3a50',
            'editorSuggestWidget.highlightForeground': '#80b0ff',
            'editorHoverWidget.background': '#1a1a24f5',
            'editorHoverWidget.border': '#3a3a50',
        },
    });
}

/**
 * Configure TypeScript defaults for the editor
 */
// Configure TypeScript defaults for the editor
function configureTypeScript(): void {
    const tsDefaults = monaco.languages.typescript.javascriptDefaults;

    // Compiler options
    tsDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        checkJs: true,
        strict: false,
        allowJs: true,
        lib: ['es2020', 'dom'],

        // Critical for library resolution
        baseUrl: '.',
        paths: {
            "textmode.js": ["file:///node_modules/textmode.js/dist/types/index.d.ts"],
            "textmode.synth.js": ["file:///node_modules/textmode.synth.js/dist/types/index.d.ts"]
        }
    });

    // Diagnostic options
    tsDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    });

    // Load all captured type files
    // The typeDefinitions object contains a map of "file:///..." -> "content"
    for (const [path, content] of Object.entries(typeDefinitions)) {
        tsDefaults.addExtraLib(content, path);
    }
}

/**
 * Create Monaco editor instance
 */
export function createMonacoEditor(options: MonacoEditorOptions): MonacoEditorInstance {
    defineTransparentTheme();
    configureTypeScript();

    const model = monaco.editor.createModel(options.initialValue, 'javascript');

    const editor = monaco.editor.create(options.container, {
        model,
        theme: 'transparent-dark',

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
    // Ctrl/Cmd + Enter: Run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        options.onRun?.();
    });

    // Ctrl/Cmd + Shift + R: Soft reset (reset frameCount)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
        options.onSoftReset?.();
    });

    // Ctrl+Shift+H: Toggle UI visibility
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
        options.onToggleUI?.();
    });

    // Ctrl+B: Toggle text background
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        options.onToggleTextBackground?.();
    });

    // Ctrl+E: Toggle auto-execute
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
        options.onToggleAutoExecute?.();
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

    return {
        editor,
        getValue: () => model.getValue(),
        setValue: (value: string) => model.setValue(value),
        setMarkers: (markers: monaco.editor.IMarkerData[]) => {
            monaco.editor.setModelMarkers(model, 'live-coding', markers);
        },
        clearMarkers: () => {
            monaco.editor.setModelMarkers(model, 'live-coding', []);
        },
        updateOptions: (options: monaco.editor.IEditorOptions) => {
            editor.updateOptions(options);
        },
        dispose: () => {
            model.dispose();
            editor.dispose();
        },
    };
}

/**
 * Create error marker from run error
 */
export function createErrorMarker(
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
