/**
 * AudioAnalyser - Extracts audio data from Strudel's AnalyserNode for transfer to iframe.
 * Polls the main audio analyser at animation frame rate and provides frequency/waveform data.
 */

/** Audio data snapshot to send to iframe */
export interface AudioData {
    /** Frequency domain data (0-255 per bin) */
    fft: number[];
    /** Time domain waveform data (0-255) */
    waveform: number[];
    /** Timestamp for synchronization */
    timestamp: number;
}

/** Options for AudioAnalyser */
export interface AudioAnalyserOptions {
    /** Callback when new audio data is available */
    onData?: (data: AudioData) => void;
    /** Initial FFT size (must be power of 2, default 1024) */
    fftSize?: number;
}

/**
 * Extracts and processes audio data from Web Audio AnalyserNode.
 * Designed to work with Strudel's window.analysers registry.
 */
export class AudioAnalyser {
    private analyser: AnalyserNode | null = null;
    private fftData: Uint8Array<ArrayBuffer>;
    private waveformData: Uint8Array<ArrayBuffer>;
    private rafId: number | null = null;
    private isRunning = false;
    private options: AudioAnalyserOptions;
    private _fftSize: number;

    constructor(options: AudioAnalyserOptions = {}) {
        this.options = options;
        this._fftSize = options.fftSize ?? 1024;

        // Pre-allocate buffers (size is fftSize/2 for frequency data)
        this.fftData = new Uint8Array(this._fftSize / 2);
        this.waveformData = new Uint8Array(this._fftSize);
    }

    /**
     * Get the current FFT size
     */
    get fftSize(): number {
        return this._fftSize;
    }

    /**
     * Set FFT size (must be power of 2: 256, 512, 1024, 2048, etc.)
     * Reallocates buffers and updates the AnalyserNode if connected.
     */
    setFftSize(size: number): void {
        // Validate power of 2
        if (size < 32 || size > 32768 || (size & (size - 1)) !== 0) {
            console.warn(`[AudioAnalyser] Invalid FFT size ${size}, must be power of 2 between 32-32768`);
            return;
        }

        this._fftSize = size;
        this.fftData = new Uint8Array(size / 2);
        this.waveformData = new Uint8Array(size);

        if (this.analyser) {
            this.analyser.fftSize = size;
        }
    }

    /**
     * Connect to a Strudel analyser by ID.
     * Strudel stores analysers in window.analysers after .analyze('id') is called.
     */
    connectToStrudel(id: string = 'main'): boolean {
        // Access Strudel's global analysers registry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const analysers = (window as any).analysers as Record<string, AnalyserNode> | undefined;

        if (!analysers || !analysers[id]) {
            return false;
        }

        this.analyser = analysers[id];
        this.analyser.fftSize = this._fftSize;
        this.analyser.smoothingTimeConstant = 0.8; // Smooth out rapid changes
        return true;
    }

    /**
     * Disconnect from the current analyser
     */
    disconnect(): void {
        this.analyser = null;
    }

    /**
     * Check if connected to an analyser
     */
    isConnected(): boolean {
        return this.analyser !== null;
    }

    /**
     * Start the polling loop
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.poll();
    }

    /**
     * Stop the polling loop
     */
    stop(): void {
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Get current audio data snapshot
     */
    getData(): AudioData {
        return {
            fft: Array.from(this.fftData),
            waveform: Array.from(this.waveformData),
            timestamp: performance.now(),
        };
    }

    /**
     * Internal polling loop
     */
    private poll = (): void => {
        if (!this.isRunning) return;

        // Try to connect if not connected (Strudel may add analyser after pattern starts)
        if (!this.analyser) {
            this.connectToStrudel('main');
        }

        // Extract data if connected
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.fftData);
            this.analyser.getByteTimeDomainData(this.waveformData);

            // Notify callback
            if (this.options.onData) {
                this.options.onData(this.getData());
            }
        }

        this.rafId = requestAnimationFrame(this.poll);
    };

    /**
     * Cleanup
     */
    dispose(): void {
        this.stop();
        this.analyser = null;
    }
}
