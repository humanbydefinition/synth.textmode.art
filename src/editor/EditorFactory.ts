/**
 * Editor Factory - centralized editor creation.
 * Provides a unified interface for creating textmode and Strudel editors.
 */

import { createMonacoEditor, type MonacoEditorInstance, type MonacoEditorOptions } from './monaco';
import { createStrudelMonacoEditor, type StrudelMonacoInstance, type StrudelMonacoOptions } from './strudelMonaco';

/**
 * Common editor callbacks shared between textmode and Strudel editors.
 */
export interface CommonEditorCallbacks {
    onChange?: (value: string) => void;
    onToggleUI?: () => void;
    onIncreaseFontSize?: () => void;
    onDecreaseFontSize?: () => void;
}

/**
 * Textmode-specific callbacks.
 */
export interface TextmodeEditorCallbacks extends CommonEditorCallbacks {
    onRun?: () => void;
    onSoftReset?: () => void;
    onToggleTextBackground?: () => void;
    onToggleAutoExecute?: () => void;
}

/**
 * Strudel-specific callbacks.
 */
export interface StrudelEditorCallbacks extends CommonEditorCallbacks {
    onRun?: () => void;
    onHush?: () => void;
}

/**
 * Editor factory configuration.
 */
export interface EditorFactoryConfig {
    /** Font size setting for editors */
    fontSize?: number;
}

/**
 * Editor factory interface.
 */
export interface IEditorFactory {
    /** Create textmode Monaco editor */
    createTextmodeEditor(
        container: HTMLElement,
        initialValue: string,
        callbacks: TextmodeEditorCallbacks
    ): MonacoEditorInstance;

    /** Create Strudel Monaco editor */
    createStrudelEditor(
        container: HTMLElement,
        initialValue: string,
        callbacks: StrudelEditorCallbacks
    ): StrudelMonacoInstance;

    /** Update font size for new editors */
    setFontSize(fontSize: number): void;

    /** Get current font size */
    getFontSize(): number;
}

/**
 * Editor Factory implementation.
 */
export class EditorFactory implements IEditorFactory {
    private fontSize: number;

    constructor(config?: EditorFactoryConfig) {
        this.fontSize = config?.fontSize ?? 14;
    }

    /**
     * Create textmode Monaco editor.
     */
    createTextmodeEditor(
        container: HTMLElement,
        initialValue: string,
        callbacks: TextmodeEditorCallbacks
    ): MonacoEditorInstance {
        const options: MonacoEditorOptions = {
            container,
            initialValue,
            onChange: callbacks.onChange,
            onRun: callbacks.onRun,
            onSoftReset: callbacks.onSoftReset,
            onToggleUI: callbacks.onToggleUI,
            onToggleTextBackground: callbacks.onToggleTextBackground,
            onToggleAutoExecute: callbacks.onToggleAutoExecute,
            onIncreaseFontSize: callbacks.onIncreaseFontSize,
            onDecreaseFontSize: callbacks.onDecreaseFontSize,
            fontSize: this.fontSize,
        };
        return createMonacoEditor(options);
    }

    /**
     * Create Strudel Monaco editor.
     */
    createStrudelEditor(
        container: HTMLElement,
        initialValue: string,
        callbacks: StrudelEditorCallbacks
    ): StrudelMonacoInstance {
        const options: StrudelMonacoOptions = {
            container,
            initialValue,
            onChange: callbacks.onChange,
            onRun: callbacks.onRun,
            onHush: callbacks.onHush,
            onToggleUI: callbacks.onToggleUI,
            onIncreaseFontSize: callbacks.onIncreaseFontSize,
            onDecreaseFontSize: callbacks.onDecreaseFontSize,
            fontSize: this.fontSize,
        };
        return createStrudelMonacoEditor(options);
    }

    /**
     * Update font size for new editors.
     */
    setFontSize(fontSize: number): void {
        this.fontSize = fontSize;
    }

    /**
     * Get current font size.
     */
    getFontSize(): number {
        return this.fontSize;
    }
}

// Re-export editor types for convenience
export type { MonacoEditorInstance } from './monaco';
export type { StrudelMonacoInstance } from './strudelMonaco';
