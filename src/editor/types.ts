/**
 * TypeScript definitions for Monaco IntelliSense
 * Provides comprehensive type definitions for the live coding environment
 */

/**
 * Complete type definitions for textmode.js and textmode.synth.js globals
 * These enable IntelliSense for t.fontSize(), synth chains, etc.
 */
export const textmodeTypes = `
// Textmode.js types for live coding

interface TextmodeLayer {
  /** Clear the layer */
  clear(): void;
  /** Apply synth chain to this layer */
  synth(chain: SynthChain): void;
  /** Set text content */
  text(content: string, x?: number, y?: number): void;
  /** Fill the layer with a character */
  fill(char: string): void;
}

interface TextmodeLayers {
  /** Base layer for rendering */
  base: TextmodeLayer;
  /** Get layer by name */
  get(name: string): TextmodeLayer | undefined;
  /** Create a new layer */
  create(name: string): TextmodeLayer;
}

interface Textmode {
  /** The canvas element */
  canvas: HTMLCanvasElement;
  /** Layer management */
  layers: TextmodeLayers;
  /** Resize the canvas */
  resizeCanvas(width: number, height: number): this;
  /** Get current width */
  width: number;
  /** Get current height */
  height: number;
  /** Current time in seconds */
  time: number;
  /** Start the render loop */
  start(): void;
  /** Stop the render loop */
  stop(): void;
  /** Render a single frame */
  render(): void;
  
  // Configuration methods (chainable)
  /** Set font size */
  fontSize(size: number): this;
  /** Set font family */
  fontFamily(family: string): this;
  /** Set cell size */
  cellSize(width: number, height: number): this;
  /** Set cell width */
  cellWidth(width: number): this;
  /** Set cell height */
  cellHeight(height: number): this;
  /** Set character set */
  charset(chars: string): this;
  /** Set default character */
  defaultChar(char: string): this;
  /** Set background color */
  background(color: string): this;
  /** Set foreground color */
  foreground(color: string): this;
}

/** The textmode instance - use this to control rendering */
declare const t: Textmode;

// Synth chain types

interface SynthChain {
  // Sources
  /** Add another source */
  add(other: SynthChain, amount?: number | number[]): SynthChain;
  
  // Color transforms
  /** Brightness adjustment */
  brightness(amount?: number | number[]): SynthChain;
  /** Contrast adjustment */
  contrast(amount?: number | number[]): SynthChain;
  /** Saturation adjustment */
  saturate(amount?: number | number[]): SynthChain;
  /** Hue rotation */
  hue(amount?: number | number[]): SynthChain;
  /** Invert colors */
  invert(amount?: number | number[]): SynthChain;
  /** Posterize */
  posterize(bins?: number | number[], gamma?: number | number[]): SynthChain;
  /** Color shift */
  color(r?: number | number[], g?: number | number[], b?: number | number[], a?: number | number[]): SynthChain;
  /** Colorama effect */
  colorama(amount?: number | number[]): SynthChain;
  /** Luma (grayscale) */
  luma(threshold?: number | number[], tolerance?: number | number[]): SynthChain;
  /** Threshold */
  thresh(threshold?: number | number[], tolerance?: number | number[]): SynthChain;
  
  // Geometry transforms
  /** Scale */
  scale(amount?: number | number[], xMult?: number | number[], yMult?: number | number[], offsetX?: number | number[], offsetY?: number | number[]): SynthChain;
  /** Rotate */
  rotate(angle?: number | number[], speed?: number | number[]): SynthChain;
  /** Pixelate */
  pixelate(x?: number | number[], y?: number | number[]): SynthChain;
  /** Repeat/tile */
  repeat(repeatX?: number | number[], repeatY?: number | number[], offsetX?: number | number[], offsetY?: number | number[]): SynthChain;
  /** Kaleidoscope */
  kaleid(nSides?: number | number[]): SynthChain;
  /** Scroll X */
  scrollX(scrollX?: number | number[], speed?: number | number[]): SynthChain;
  /** Scroll Y */
  scrollY(scrollY?: number | number[], speed?: number | number[]): SynthChain;
  
  // Blend modes
  /** Multiply blend */
  mult(other: SynthChain, amount?: number | number[]): SynthChain;
  /** Difference blend */
  diff(other: SynthChain): SynthChain;
  /** Blend with another chain */
  blend(other: SynthChain, amount?: number | number[]): SynthChain;
  /** Layer on top */
  layer(other: SynthChain): SynthChain;
  /** Mask with another chain */
  mask(other: SynthChain): SynthChain;
  
  // Modulation
  /** Modulate coordinates */
  modulate(other: SynthChain, amount?: number | number[]): SynthChain;
  /** Modulate with hue */
  modulateHue(other: SynthChain, amount?: number | number[]): SynthChain;
  /** Modulate rotation */
  modulateRotate(other: SynthChain, amount?: number | number[], speed?: number | number[]): SynthChain;
  /** Modulate scale */
  modulateScale(other: SynthChain, amount?: number | number[], offset?: number | number[]): SynthChain;
  /** Modulate pixelation */
  modulatePixelate(other: SynthChain, multiple?: number | number[], offset?: number | number[]): SynthChain;
  /** Modulate scroll X */
  modulateScrollX(other: SynthChain, scrollX?: number | number[], speed?: number | number[]): SynthChain;
  /** Modulate scroll Y */
  modulateScrollY(other: SynthChain, scrollY?: number | number[], speed?: number | number[]): SynthChain;
  /** Modulate repeat */
  modulateRepeat(other: SynthChain, repeatX?: number | number[], repeatY?: number | number[], offsetX?: number | number[], offsetY?: number | number[]): SynthChain;
  /** Modulate kaleidoscope */
  modulateKaleid(other: SynthChain, nSides?: number | number[]): SynthChain;

  // Character modifiers
  /** Set cell color */
  cellColor(other: SynthChain): SynthChain;
  /** Set character color */
  charColor(other: SynthChain): SynthChain;
  
  // Utility
  /** Clone this chain */
  clone(): SynthChain;
}

// Source functions

/** Reference the current output (feedback) */
declare function src(): SynthChain;

/** Oscillator source */
declare function osc(frequency?: number | number[], sync?: number | number[], offset?: number | number[]): SynthChain;

/** Noise source */
declare function noise(scale?: number | number[], offset?: number | number[]): SynthChain;

/** Gradient source */
declare function gradient(speed?: number | number[]): SynthChain;

/** Solid color source */
declare function solid(r?: number | number[], g?: number | number[], b?: number | number[], a?: number | number[]): SynthChain;

/** Shape source */
declare function shape(sides?: number | number[], radius?: number | number[], smoothing?: number | number[]): SynthChain;

/** Character source for textmode */
declare function char(source: SynthChain): SynthChain;

/** The synth plugin */
declare const SynthPlugin: unknown;

// Tracked utilities

/** Register a cleanup function to be called on reload */
declare function onDispose(fn: () => void): void;

/** Tracked setTimeout - automatically cleared on reload */
declare function setTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;

/** Tracked clearTimeout */
declare function clearTimeout(id?: number): void;

/** Tracked setInterval - automatically cleared on reload */
declare function setInterval(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;

/** Tracked clearInterval */
declare function clearInterval(id?: number): void;

/** Tracked requestAnimationFrame - automatically cancelled on reload */
declare function requestAnimationFrame(callback: FrameRequestCallback): number;

/** Tracked cancelAnimationFrame */
declare function cancelAnimationFrame(id: number): void;

/** Tracked addEventListener - automatically removed on reload */
declare function addEventListener(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void;

// Array extensions from textmode.synth.js
interface Array<T> {
  /** Animate through array values at given speed */
  fast(speed?: number): number[];
  /** Smooth interpolation through array values */
  smooth(speed?: number): number[];
}
`;
