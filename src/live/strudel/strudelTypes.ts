/**
 * Strudel type definitions for Monaco IntelliSense
 * These provide autocomplete and documentation for Strudel's mini-notation and functions
 */

export const strudelTypeDefinitions = `
// Core Pattern type
declare class Pattern<T = unknown> {
    /** Set the sound/sample name */
    s(name: string): Pattern;
    /** Alias for s() - set sound */
    sound(name: string): Pattern;
    /** Set note value(s) */
    note(pattern: string | number): Pattern;
    /** Alias for note() */
    n(pattern: string | number): Pattern;
    /** Set velocity (0-1) */
    velocity(v: number): Pattern;
    /** Alias for velocity */
    gain(v: number): Pattern;
    /** Set pan (-1 to 1) */
    pan(p: number): Pattern;
    /** Low-pass filter frequency */
    lpf(freq: number): Pattern;
    /** High-pass filter frequency */
    hpf(freq: number): Pattern;
    /** Band-pass filter frequency */
    bpf(freq: number): Pattern;
    /** Filter resonance (0-1) */
    resonance(r: number): Pattern;
    /** Filter Q (resonance alias) */
    lpq(q: number): Pattern;
    /** Delay amount (0-1) */
    delay(d: number): Pattern;
    /** Delay time */
    delaytime(t: number): Pattern;
    /** Delay feedback */
    delayfeedback(f: number): Pattern;
    /** Reverb room size */
    room(r: number): Pattern;
    /** Reverb size */
    size(s: number): Pattern;
    /** Speed/pitch multiplier */
    speed(s: number): Pattern;
    /** Begin sample at offset (0-1) */
    begin(b: number): Pattern;
    /** End sample at offset (0-1) */
    end(e: number): Pattern;
    /** Cut group for sample choking */
    cut(c: number): Pattern;
    /** Attack time in seconds */
    attack(a: number): Pattern;
    /** Decay time in seconds */
    decay(d: number): Pattern;
    /** Sustain level (0-1) */
    sustain(s: number): Pattern;
    /** Release time in seconds */
    release(r: number): Pattern;
    
    // Time manipulation
    /** Slow down pattern by factor */
    slow(factor: number): Pattern;
    /** Speed up pattern by factor */
    fast(factor: number): Pattern;
    /** Reverse pattern */
    rev(): Pattern;
    /** Palindrome pattern */
    palindrome(): Pattern;
    /** Apply pattern every n cycles */
    every(n: number, fn: (p: Pattern) => Pattern): Pattern;
    /** Apply pattern sometimes (probability) */
    sometimes(fn: (p: Pattern) => Pattern): Pattern;
    /** Apply pattern with probability */
    sometimesBy(prob: number, fn: (p: Pattern) => Pattern): Pattern;
    /** Rotate pattern by offset */
    rotate(offset: number): Pattern;
    /** Offset pattern by cycles */
    late(cycles: number): Pattern;
    /** Offset pattern early by cycles */
    early(cycles: number): Pattern;
    
    // Structure
    /** Stack patterns on top of each other */
    stack(...patterns: Pattern[]): Pattern;
    /** Sequence patterns one after another */
    cat(...patterns: Pattern[]): Pattern;
    /** Sequence with fast timing */
    fastcat(...patterns: Pattern[]): Pattern;
    /** Repeat pattern n times */
    repeat(n: number): Pattern;
    /** Euclidean rhythm */
    euclid(pulses: number, steps: number, rotation?: number): Pattern;
    /** Apply struct pattern */
    struct(pattern: string): Pattern;
    
    // Effects
    /** Distortion amount */
    distort(d: number): Pattern;
    /** Shape waveshaping */
    shape(s: number): Pattern;
    /** Bitcrusher */
    crush(bits: number): Pattern;
    /** Coarse pitch */
    coarse(c: number): Pattern;
    
    // Pitch
    /** Add semitones */
    add(semitones: number): Pattern;
    /** Subtract semitones */
    sub(semitones: number): Pattern;
    /** Multiply frequency */
    mul(factor: number): Pattern;
    /** Divide frequency */
    div(factor: number): Pattern;
    
    // Operators
    /** Layer patterns */
    layer(...patterns: Pattern[]): Pattern;
    /** Apply function to pattern */
    apply(fn: (p: Pattern) => Pattern): Pattern;
    /** Filter events by function */
    when(cond: (event: unknown) => boolean, fn: (p: Pattern) => Pattern): Pattern;
}

// Mini-notation string patterns
/** Create a note pattern from mini-notation */
declare function note(pattern: string): Pattern;
/** Create a note pattern (shorthand) */
declare function n(pattern: string | number): Pattern;
/** Create a sample pattern */
declare function s(pattern: string): Pattern;
/** Create a sound pattern (alias for s) */
declare function sound(pattern: string): Pattern;

// Pattern constructors
/** Create pattern from string with mini-notation */
declare function mini(pattern: string): Pattern;
/** Stack multiple patterns to play simultaneously */
declare function stack(...patterns: Pattern[]): Pattern;
/** Concatenate patterns sequentially */
declare function cat(...patterns: Pattern[]): Pattern;
/** Concatenate patterns with faster timing */
declare function fastcat(...patterns: Pattern[]): Pattern;
/** Sequence patterns */
declare function seq(...patterns: Pattern[]): Pattern;
/** Layer patterns with polymeter */
declare function polymeter(...patterns: Pattern[]): Pattern;

// Oscillators
/** Sine wave oscillator */
declare function sine(freq?: number): Pattern;
/** Saw wave oscillator */
declare function saw(freq?: number): Pattern;
/** Square wave oscillator */
declare function square(freq?: number): Pattern;
/** Triangle wave oscillator */
declare function tri(freq?: number): Pattern;

// Utility functions
/** Stop all audio immediately */
declare function hush(): void;
/** Set BPM (beats per minute) */
declare function setcps(cps: number): void;
/** Get current cycles per second */
declare function getcps(): number;
/** Load samples from URL */
declare function samples(url: string): Promise<void>;

// Scale and chord functions
/** Apply scale to pattern */
declare function scale(name: string, pattern: Pattern): Pattern;
/** Create chord from pattern */
declare function chord(pattern: string): Pattern;

// Random and chance
/** Random value between 0 and 1 */
declare function rand(): Pattern;
/** Random integer up to max */
declare function irand(max: number): Pattern;
/** Choose randomly from options */
declare function choose(...options: unknown[]): Pattern;
/** Choose with weighted probability */
declare function wchoose(...pairs: [unknown, number][]): Pattern;

// Arithmetic operations on patterns
/** Add to pattern values */
declare function add(n: number): (p: Pattern) => Pattern;
/** Subtract from pattern values */
declare function sub(n: number): (p: Pattern) => Pattern;
/** Multiply pattern values */
declare function mul(n: number): (p: Pattern) => Pattern;
/** Divide pattern values */
declare function div(n: number): (p: Pattern) => Pattern;

// Control patterns
/** Set velocity */
declare function velocity(v: number): Pattern;
/** Set gain */
declare function gain(v: number): Pattern;
/** Set pan position */
declare function pan(p: number): Pattern;
/** Set low-pass filter */
declare function lpf(freq: number): Pattern;
/** Set high-pass filter */
declare function hpf(freq: number): Pattern;

// Constants
/** Silence/rest pattern */
declare const silence: Pattern;
/** Pure pattern from value */
declare function pure<T>(value: T): Pattern<T>;
`;
