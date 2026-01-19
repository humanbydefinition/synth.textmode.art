import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    DEFAULT_SETTINGS,
    type AppSettings,
    type CodeError,
    type StatusState
} from '@/types/app.types';

const MOBILE_BREAKPOINT = 768;
const CONFIRMATION_DELAY_MS = 100;

export interface Panel {
    id: string;
    label: string;
}

export interface PluginState {
    /** Last known working code for this plugin */
    lastWorkingCode: string | null;

    /** Pending working code (for confirmation delay) */
    pendingWorkingCode: string | null;

    /** Confirmation timer ID */
    confirmationTimer: number | null;

    /** Custom state specific to the plugin (e.g., StrudelState) */
    customState: Record<string, unknown>;

    /** Whether the plugin runtime/engine is fully initialized */
    isInitialized: boolean;
}


export interface AppState {
    // --- App Data State ---
    settings: AppSettings;
    error: CodeError | null;
    status: StatusState;
    pluginStates: Map<string, PluginState>;

    // --- UI/Layout State ---
    isMobile: boolean;
    activePanel: string;
    panels: Panel[];
    editorOrientation: 'horizontal' | 'vertical';
    splitRatio: number;

    // --- Actions ---
    setSettings: (settings: AppSettings) => void;
    setError: (error: CodeError | null) => void;
    setStatus: (status: StatusState) => void;

    // Plugin State Actions
    initPluginState: (pluginId: string) => void;
    setPluginLastWorkingCode: (pluginId: string, code: string | null) => void;
    setPluginPendingWorkingCode: (pluginId: string, code: string) => void;
    cancelPluginPendingWorkingCode: (pluginId: string) => void;
    setPluginCustomState: <T>(pluginId: string, key: string, value: T) => void;
    setPluginInitialized: (pluginId: string, isInitialized: boolean) => void;

    // UI Actions
    setIsMobile: (isMobile: boolean) => void;
    setActivePanel: (panel: string) => void;
    setPanels: (panels: Panel[]) => void;
    setEditorOrientation: (orientation: 'horizontal' | 'vertical') => void;
    setSplitRatio: (ratio: number) => void;
}

// Helper to create initial plugin state
function createPluginState(): PluginState {
    return {
        lastWorkingCode: null,
        pendingWorkingCode: null,
        confirmationTimer: null,
        customState: {},
        isInitialized: false,
    };
}


/**
 * Centralized Zustand state for the application.
 * Manages configuration, errors, status, plugin states, and UI layout.
 */

export const useAppStore = create<AppState>()(subscribeWithSelector((set, get) => ({
    // Initial State
    settings: DEFAULT_SETTINGS,
    error: null,
    status: 'ready',
    pluginStates: new Map(),

    isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,
    activePanel: '',
    panels: [],
    editorOrientation: DEFAULT_SETTINGS.editorOrientation,
    splitRatio: DEFAULT_SETTINGS.splitRatio,

    // Actions
    setSettings: (settings) => set({ settings }),
    setError: (error) => set({ error }),
    setStatus: (status) => set({ status }),

    initPluginState: (pluginId) => {
        set((state) => {
            if (state.pluginStates.has(pluginId)) return state;
            const newStates = new Map(state.pluginStates);
            newStates.set(pluginId, createPluginState());
            return { pluginStates: newStates };
        });
    },

    setPluginLastWorkingCode: (pluginId, code) => {
        set((state) => {
            const newStates = new Map(state.pluginStates);
            const pState = newStates.get(pluginId) || createPluginState();
            newStates.set(pluginId, { ...pState, lastWorkingCode: code });
            return { pluginStates: newStates };
        });
    },

    setPluginPendingWorkingCode: (pluginId, code) => {
        const state = get();
        const pState = state.pluginStates.get(pluginId);

        // Clear existing timer if any
        if (pState?.confirmationTimer) {
            clearTimeout(pState.confirmationTimer);
        }

        // Set timer
        const timer = setTimeout(() => {
            const currentState = get();
            const currentPState = currentState.pluginStates.get(pluginId);
            if (currentPState?.pendingWorkingCode) {
                // Commit pending to last working
                get().setPluginLastWorkingCode(pluginId, currentPState.pendingWorkingCode);
                // Clear pending
                set((s) => {
                    const ns = new Map(s.pluginStates);
                    const ps = ns.get(pluginId);
                    if (ps) ns.set(pluginId, { ...ps, pendingWorkingCode: null, confirmationTimer: null });
                    return { pluginStates: ns };
                });
            }
        }, CONFIRMATION_DELAY_MS) as unknown as number;

        // Update state with pending code and timer
        set((s) => {
            const ns = new Map(s.pluginStates);
            const ps = ns.get(pluginId) || createPluginState();
            ns.set(pluginId, { ...ps, pendingWorkingCode: code, confirmationTimer: timer });
            return { pluginStates: ns };
        });
    },

    cancelPluginPendingWorkingCode: (pluginId) => {
        set((state) => {
            const newStates = new Map(state.pluginStates);
            const pState = newStates.get(pluginId);
            if (pState) {
                if (pState.confirmationTimer) clearTimeout(pState.confirmationTimer);
                newStates.set(pluginId, { ...pState, pendingWorkingCode: null, confirmationTimer: null });
            }
            return { pluginStates: newStates };
        });
    },

    setPluginCustomState: (pluginId, key, value) => {
        set((state) => {
            const newStates = new Map(state.pluginStates);
            const pState = newStates.get(pluginId) || createPluginState();
            newStates.set(pluginId, {
                ...pState,
                customState: { ...pState.customState, [key]: value }
            });
            return { pluginStates: newStates };
        });
    },

    setPluginInitialized: (pluginId, isInitialized) => {
        set((state) => {
            const newStates = new Map(state.pluginStates);
            const pState = newStates.get(pluginId) || createPluginState();
            newStates.set(pluginId, { ...pState, isInitialized });
            return { pluginStates: newStates };
        });
    },


    setIsMobile: (isMobile) => set({ isMobile }),
    setActivePanel: (activePanel) => set({ activePanel }),
    setPanels: (panels) => set({ panels }),
    setEditorOrientation: (editorOrientation) => set({ editorOrientation }),
    setSplitRatio: (splitRatio) => set({ splitRatio }),
})));

/**
 * Initialize app store with window resize listener.
 * Note: Persistence subscriptions are handled by App.ts (the orchestrator).
 */
export function initAppStore(): () => void {
    const handleResize = () => {
        const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        const currentIsMobile = useAppStore.getState().isMobile;
        if (isMobile !== currentIsMobile) {
            useAppStore.getState().setIsMobile(isMobile);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
        window.removeEventListener('resize', handleResize);
    };
}
