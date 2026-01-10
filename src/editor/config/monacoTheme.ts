import * as monaco from 'monaco-editor';

/**
 * Define transparent theme for overlay editing
 */
export function defineTransparentTheme(): void {
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
