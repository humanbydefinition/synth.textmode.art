/**
 * Default Strudel sketch code for new users
 */
export const defaultStrudelSketch = `// Live coding with strudel
// Ctrl+Enter = run · Ctrl+. = stop (hush)
// Docs: https://strudel.cc

// Load a custom sample from a URL
// This maps the name "conga" to a specific audio file
// await samples({
//   conga: 'https://glfmn.io/samples/menegass-conga-7.wav'
// });

// Use stack() to layer multiple patterns together
stack(
  // Drum pattern
  s("bd sd:1 bd bd, hh*8")
    .gain(0.8)
    .lpf(2000),

  // Melodic pattern
  note("c3 eb3 g3 bb3")
    .s("sawtooth")
    .lpf(800)
    .attack(0.01)
    .decay(0.2)
    .sustain(0.3)
    .release(0.5)
    .gain(0.5)
    .slow(2)
)
`;
