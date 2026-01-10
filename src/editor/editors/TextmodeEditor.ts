import * as monaco from 'monaco-editor';
import { BaseMonacoEditor } from '../core/BaseMonacoEditor';
import { type EditorOptions } from '../core/IEditor';
import { typeDefinitions } from '../config/generatedTypes';

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

export interface TextmodeEditorOptions extends EditorOptions {
    onRun?: () => void;
    onSoftReset?: () => void;
    onToggleTextBackground?: () => void;
    onToggleAutoExecute?: () => void;
}

export class TextmodeEditor extends BaseMonacoEditor {
    protected override options: TextmodeEditorOptions;

    constructor(options: TextmodeEditorOptions) {
        super(options);
        this.options = options;
        this.configureTypeScript();
        this.registerTextmodeKeybindings();
    }

    protected getLanguageId(): string {
        return 'javascript';
    }

    protected getMarkerOwner(): string {
        return 'live-coding';
    }

    private registerTextmodeKeybindings(): void {
        // Ctrl/Cmd + Enter: Run code
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.options.onRun?.();
        });

        // Ctrl/Cmd + Shift + R: Soft reset
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
            this.options.onSoftReset?.();
        });

        // Ctrl+B: Toggle text background
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
            this.options.onToggleTextBackground?.();
        });

        // Ctrl+E: Toggle auto-execute
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
            this.options.onToggleAutoExecute?.();
        });
    }

    private configureTypeScript(): void {
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
        for (const [path, content] of Object.entries(typeDefinitions)) {
            tsDefaults.addExtraLib(content, path);
        }

        // Disable simplified mode to remove context menu items
        tsDefaults.setModeConfiguration({
            definitions: false,
            references: false,
            documentSymbols: false,
            // Keep others enabled
            completionItems: true,
            hovers: true,
            diagnostics: true,
            documentHighlights: true,
            rename: true,
            documentRangeFormattingEdits: true,
        });
    }
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
