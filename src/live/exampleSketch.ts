/**
 * Default example sketch code
 */
export const exampleSketch = `// Live coding with textmode.synth.js
// Press Ctrl+Enter to run, Ctrl+Shift+R for hard reset

const charChain = noise(0.1, 0)
  .mult(osc(0.1, 0.25, 1))
  .scrollY(1, 0.25)
  .pixelate([100, 40, 20, 70].fast(0.25))
  .modulateRotate(src().scale(0.5), 0.125)
  .diff(src().rotate([-0.05, 0.05].fast(0.125)));

const colorChain = noise()
  .mult(osc(10, 0.25, 1))
  .scrollY(1, 0.25)
  .pixelate([100, 40, 20, 70].fast(0.25))
  .modulateRotate(src().scale(0.5), 0.125)
  .diff(src().rotate([-0.05, 0.05].fast(0.125)));

t.layers.base.synth(
  char(charChain)
    .cellColor(colorChain)
    .charColor(colorChain.clone().hue(0.5))
);

// Return a cleanup function (optional):
// return () => { console.log('cleanup!'); };
`;
