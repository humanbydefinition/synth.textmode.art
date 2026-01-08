/**
 * Layout Manager - handles split-pane resizing, mobile layout, and panel visibility.
 * Extracted from App class to provide focused layout management.
 */

// Mobile breakpoint in pixels
const MOBILE_BREAKPOINT = 768;

/**
 * Panel type for the dual-editor layout.
 */
export type PanelType = 'textmode' | 'strudel';

/**
 * Layout configuration options.
 */
export interface LayoutOptions {
    /** Container element ID */
    containerId: string;
    /** Textmode panel element */
    textmodePanel: HTMLElement;
    /** Strudel panel element */
    strudelPanel: HTMLElement;
    /** Textmode editor container for touch handling */
    textmodeEditorContainer?: HTMLElement | null;
    /** Strudel editor container for touch handling */
    strudelEditorContainer?: HTMLElement | null;
    /** Initial split ratio (0-1), default 0.5 */
    initialSplitRatio?: number;
    /** Callback when active panel changes (for editor focus) */
    onPanelChange?: (panel: PanelType) => void;
    /** Callback when layout changes (mobile/desktop switch) */
    onLayoutChange?: () => void;
}

/**
 * Layout manager interface for dependency injection and testing.
 */
export interface ILayoutManager {
    /** Whether currently in mobile layout */
    readonly isMobile: boolean;
    /** Currently active panel (for mobile tab layout) */
    readonly activePanel: PanelType;
    /** Current split ratio (0-1) */
    readonly splitRatio: number;
    /** Initialize the layout manager */
    init(): void;
    /** Set the active panel (triggers callback) */
    setActivePanel(panel: PanelType): void;
    /** Cleanup resources */
    dispose(): void;
}

/**
 * Layout Manager implementation.
 */
export class LayoutManager implements ILayoutManager {
    private _isMobile: boolean;
    private _activePanel: PanelType = 'textmode';
    private _splitRatio: number;
    private splitResizer: HTMLElement | null = null;

    private readonly containerId: string;
    private readonly textmodePanel: HTMLElement;
    private readonly strudelPanel: HTMLElement;
    private readonly textmodeEditorContainer: HTMLElement | null;
    private readonly strudelEditorContainer: HTMLElement | null;
    private readonly onPanelChange?: (panel: PanelType) => void;
    private readonly onLayoutChange?: () => void;

    // Event listeners for cleanup
    private resizeHandler: (() => void) | null = null;
    private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    private mouseUpHandler: (() => void) | null = null;

    constructor(options: LayoutOptions) {
        this.containerId = options.containerId;
        this.textmodePanel = options.textmodePanel;
        this.strudelPanel = options.strudelPanel;
        this.textmodeEditorContainer = options.textmodeEditorContainer ?? null;
        this.strudelEditorContainer = options.strudelEditorContainer ?? null;
        this._splitRatio = options.initialSplitRatio ?? 0.5;
        this.onPanelChange = options.onPanelChange;
        this.onLayoutChange = options.onLayoutChange;
        this._isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    }

    get isMobile(): boolean {
        return this._isMobile;
    }

    get activePanel(): PanelType {
        return this._activePanel;
    }

    get splitRatio(): number {
        return this._splitRatio;
    }

    /**
     * Initialize the layout manager.
     */
    init(): void {
        // Setup resize handler
        this.resizeHandler = () => this.handleResize();
        window.addEventListener('resize', this.resizeHandler);

        // Setup mobile or desktop layout
        if (this._isMobile) {
            this.setupMobileLayout();
        } else {
            this.setupSplitResizer();
        }

        // Setup panel focus tracking
        this.setupPanelFocusTracking();

        // Setup mobile touch handling for pinch-to-zoom
        this.setupMobileTouchHandling();
    }

    /**
     * Set the active panel.
     */
    setActivePanel(panel: PanelType): void {
        this._activePanel = panel;
        this.updateMobilePanelVisibility();
        this.onPanelChange?.(panel);
    }

    /**
     * Cleanup resources.
     */
    dispose(): void {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        if (this.mouseUpHandler) {
            document.removeEventListener('mouseup', this.mouseUpHandler);
        }
        if (this.splitResizer) {
            this.splitResizer.remove();
        }
    }

    // ==================== Private Methods ====================

    /**
     * Setup mobile tab layout.
     */
    private setupMobileLayout(): void {
        const appContainer = document.getElementById(this.containerId);
        if (appContainer) {
            appContainer.classList.add('tab-layout');
        }
        this.updateMobilePanelVisibility();
    }

    /**
     * Setup the split resizer between textmode and strudel panels.
     */
    private setupSplitResizer(): void {
        const appContainer = document.getElementById(this.containerId);
        if (!appContainer) return;

        // Create resizer element
        this.splitResizer = document.createElement('div');
        this.splitResizer.id = 'split-resizer';

        // Insert resizer between the two panels
        appContainer.insertBefore(this.splitResizer, this.strudelPanel);

        // Apply initial split ratio
        this.applySplitRatio();

        // Drag state
        let isDragging = false;

        const startDrag = (e: MouseEvent) => {
            isDragging = true;
            this.splitResizer?.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        this.mouseMoveHandler = (e: MouseEvent) => {
            if (!isDragging) return;

            const containerRect = appContainer.getBoundingClientRect();

            // Calculate new ratio based on mouse position
            const relativeX = e.clientX - containerRect.left;
            let newRatio = relativeX / containerRect.width;

            // Clamp ratio between 20% and 80%
            newRatio = Math.max(0.2, Math.min(0.8, newRatio));

            this._splitRatio = newRatio;
            this.applySplitRatio();
        };

        this.mouseUpHandler = () => {
            if (!isDragging) return;
            isDragging = false;
            this.splitResizer?.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        // Event listeners
        this.splitResizer.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', this.mouseMoveHandler);
        document.addEventListener('mouseup', this.mouseUpHandler);
    }

    /**
     * Apply the current split ratio to panels.
     */
    private applySplitRatio(): void {
        if (this._isMobile) return;

        const resizerWidth = this.splitResizer?.offsetWidth ?? 8;

        // Use flex-basis instead of flex for precise control
        this.textmodePanel.style.flex = 'none';
        this.textmodePanel.style.width = `calc(${this._splitRatio * 100}% - ${resizerWidth / 2}px)`;

        this.strudelPanel.style.flex = 'none';
        this.strudelPanel.style.width = `calc(${(1 - this._splitRatio) * 100}% - ${resizerWidth / 2}px)`;
    }

    /**
     * Update mobile panel visibility based on active panel.
     */
    private updateMobilePanelVisibility(): void {
        if (!this._isMobile) return;

        this.textmodePanel.classList.toggle('hidden', this._activePanel !== 'textmode');
        this.strudelPanel.classList.toggle('hidden', this._activePanel !== 'strudel');
    }

    /**
     * Handle window resize.
     */
    private handleResize(): void {
        const wasMobile = this._isMobile;
        this._isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

        if (wasMobile !== this._isMobile) {
            const appContainer = document.getElementById(this.containerId);
            if (appContainer) {
                if (this._isMobile) {
                    appContainer.classList.add('tab-layout');
                    this.updateMobilePanelVisibility();
                    // Reset flex styles for mobile
                    this.textmodePanel.style.flex = '';
                    this.textmodePanel.style.width = '';
                    this.strudelPanel.style.flex = '';
                    this.strudelPanel.style.width = '';
                } else {
                    appContainer.classList.remove('tab-layout');
                    // Show both panels on desktop
                    this.textmodePanel.classList.remove('hidden');
                    this.strudelPanel.classList.remove('hidden');
                    // Reapply split ratio for desktop
                    this.applySplitRatio();
                }
            }
            this.onLayoutChange?.();
        }
    }

    /**
     * Setup panel focus tracking.
     */
    private setupPanelFocusTracking(): void {
        this.textmodePanel.addEventListener('focusin', () => {
            this._activePanel = 'textmode';
        });

        this.strudelPanel.addEventListener('focusin', () => {
            this._activePanel = 'strudel';
        });
    }

    /**
     * Setup mobile touch handling for pinch-to-zoom.
     */
    private setupMobileTouchHandling(): void {
        const setupForContainer = (container: HTMLElement | null) => {
            if (!container) return;

            let touchCount = 0;

            container.addEventListener('touchstart', (e) => {
                touchCount = e.touches.length;
                if (touchCount >= 2) {
                    container.style.pointerEvents = 'none';
                }
            }, { passive: true });

            container.addEventListener('touchend', () => {
                touchCount = 0;
                container.style.pointerEvents = 'auto';
            }, { passive: true });

            container.addEventListener('touchcancel', () => {
                touchCount = 0;
                container.style.pointerEvents = 'auto';
            }, { passive: true });
        };

        setupForContainer(this.textmodeEditorContainer);
        setupForContainer(this.strudelEditorContainer);

        // Reset viewport zoom on page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                const viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                    const content = viewport.getAttribute('content') || '';
                    viewport.setAttribute('content', content + ', initial-scale=1');
                    setTimeout(() => {
                        viewport.setAttribute('content', content);
                    }, 10);
                }
            }, 100);
        });
    }
}
