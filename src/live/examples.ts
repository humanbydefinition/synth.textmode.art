/**
 * Pre-defined example sketches for the Examples tab
 */

export interface Example {
    id: string;
    name: string;
    description: string;
    category: 'basic' | 'effects' | 'advanced';
    code: string;
}

export const examples: Example[] = [
    // Basic Examples
    {
        id: 'noise-intro',
        name: 'Noise Field',
        description: 'Simple animated noise pattern',
        category: 'basic',
        code: `// Simple noise field
const pattern = noise(0.1, 0.25)
  .scrollY(1, 0.1);

t.layers.base.synth(
  char(pattern)
    .charColor(pattern.clone().hue(0.5))
);`,
    },
    {
        id: 'osc-intro',
        name: 'Oscillator Waves',
        description: 'Basic oscillator patterns',
        category: 'basic',
        code: `// Oscillating wave patterns
const wave = osc(10, 0.1, 1)
  .mult(osc(5, 0.2, 0.5).rotate(0.5));

t.layers.base.synth(
  char(wave)
    .charColor(wave.clone())
    .cellColor(wave.clone().invert())
);`,
    },
    {
        id: 'gradient-intro',
        name: 'Gradient Flow',
        description: 'Smooth color gradients',
        category: 'basic',
        code: `// Flowing gradients
const grad = gradient()
  .scrollX(1, 0.1)
  .kaleid(4);

t.layers.base.synth(
  char(grad)
    .charColor(grad.clone().hue([0, 0.5].fast(0.1)))
    .cellColor(grad.clone().saturate(2))
);`,
    },

    // Effects Examples
    {
        id: 'pixelate-effect',
        name: 'Pixelation',
        description: 'Dynamic pixelation effect',
        category: 'effects',
        code: `// Dynamic pixelation
const base = noise(0.2, 0.1)
  .mult(osc(8, 0.1, 1));

const pixelated = base
  .pixelate([20, 40, 80, 40].fast(0.25));

t.layers.base.synth(
  char(pixelated)
    .charColor(pixelated.clone().hue(0.3))
);`,
    },
    {
        id: 'rotate-effect',
        name: 'Rotation Mosaic',
        description: 'Modulated rotation patterns',
        category: 'effects',
        code: `// Rotation mosaic
const tiles = voronoi(10, 0.5)
  .modulateRotate(osc(4, 0.1), 0.5)
  .kaleid(6);

t.layers.base.synth(
  char(tiles)
    .charColor(tiles.clone().colorama(0.5))
    .cellColor(tiles.clone().invert().saturate(0.5))
);`,
    },
    {
        id: 'feedback-effect',
        name: 'Feedback Loop',
        description: 'Self-referencing feedback',
        category: 'effects',
        code: `// Feedback loop effect
const input = noise(0.5, 0.1)
  .mult(osc(3, 0.05, 0.5));

const feedback = src()
  .scale(1.01)
  .rotate(0.01)
  .blend(input, 0.1);

t.layers.base.synth(
  char(feedback)
    .charColor(feedback.clone().hue([0, 1].fast(0.1)))
);`,
    },

    // Advanced Examples
    {
        id: 'advanced-composite',
        name: 'Layer Composite',
        description: 'Multi-layer composition',
        category: 'advanced',
        code: `// Multi-layer composition
const layer1 = noise(0.1, 0)
  .mult(osc(0.1, 0.25, 1))
  .scrollY(1, 0.25)
  .pixelate([100, 40, 20, 70].fast(0.25));

const layer2 = layer1.clone()
  .modulateRotate(src().scale(0.5), 0.125)
  .diff(src().rotate([-0.05, 0.05].fast(0.125)));

t.layers.base.synth(
  char(layer2)
    .cellColor(layer2.clone())
    .charColor(layer2.clone().hue(0.5))
);`,
    },
    {
        id: 'advanced-kaleid',
        name: 'Kaleidoscope',
        description: 'Complex kaleidoscopic patterns',
        category: 'advanced',
        code: `// Kaleidoscopic patterns
const source = osc(6, 0.1, 1.5)
  .modulate(noise(3, 0.2), 0.3)
  .kaleid([3, 4, 6, 8].fast(0.125))
  .rotate([0, Math.PI].fast(0.05));

const colors = source.clone()
  .colorama(0.3)
  .saturate(1.5);

t.layers.base.synth(
  char(source)
    .charColor(colors)
    .cellColor(colors.clone().invert())
);`,
    },
    {
        id: 'advanced-reactive',
        name: 'Reactive Grid',
        description: 'Time-reactive ASCII grid',
        category: 'advanced',
        code: `// Time-reactive ASCII grid
const grid = shape(4, 0.5, 0.1)
  .repeat(8, 6)
  .modulate(osc(10, 0.1), () => Math.sin(t.frameCount * 0.02) * 0.1);

const colorShift = gradient()
  .hue(() => t.frameCount * 0.001)
  .scrollX(1, 0.2);

t.layers.base.synth(
  char(grid)
    .charColor(colorShift)
    .cellColor(colorShift.clone().invert().saturate(0.3))
);`,
    },
];

/**
 * Get examples grouped by category
 */
export function getExamplesByCategory(): Record<string, Example[]> {
    return examples.reduce((acc, example) => {
        if (!acc[example.category]) {
            acc[example.category] = [];
        }
        acc[example.category].push(example);
        return acc;
    }, {} as Record<string, Example[]>);
}

/**
 * Category display names
 */
export const categoryNames: Record<string, string> = {
    basic: 'Basic',
    effects: 'Effects',
    advanced: 'Advanced',
};
