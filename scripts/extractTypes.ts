/**
 * Type Extraction Script for Monaco IntelliSense
 *
 * This script extracts ALL .d.ts files from specified libraries and bundles them
 * into a JSON map of "file path" -> "content".
 *
 * Unlike the previous approach, this DOES NOT flatten or modify the files.
 * It preserves the module structure so that internal imports (import { x } from './y')
 * work correctly in Monaco.
 *
 * It also generates a `global.d.ts` that imports the libraries and declares
 * the global variables (t, osc, noise, etc.) used in the live environment.
 */
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const LIBRARIES = [
    {
        name: 'textmode.js',
        // We'll define the root types dir to help with relative path calculation
        // This will be auto-detected if not set, but explicit is good.
        typesRoot: 'dist/types'
    },
    {
        name: 'textmode.synth.js',
        typesRoot: 'dist/types'
    }
];

const OUTPUT_PATH = 'src/editor/generatedTypes.ts';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Recursively find all .d.ts files
 */
function findAllDtsFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findAllDtsFiles(fullPath));
        } else if (entry.name.endsWith('.d.ts') && !entry.name.endsWith('.d.ts.map')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Get the types directory for a package
 */
function getTypesDir(packageName: string): string | null {
    const packageJsonPath = path.join('node_modules', packageName, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return null;

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Try types/typings field
    const typesEntry = packageJson.types || packageJson.typings;
    if (typesEntry) {
        // If types points to a file, usage dirname. Only use it if it seems to be the root.
        // Actually, for Monaco map we want ALL files in that tree.
        // Usually it's in ./dist/types or ./types or similar.
        return path.join('node_modules', packageName, path.dirname(typesEntry));
    }

    // Fallback
    const distTypesPath = path.join('node_modules', packageName, 'dist', 'types');
    if (fs.existsSync(distTypesPath)) return distTypesPath;

    return null;
}

/**
 * Escape content for inclusion in a template string
 */
function escapeContent(str: string): string {
    // We double-escape backticks and ${ because this string will be interpreted 
    // into a template literal in the generated file.
    return str
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/`/g, '\\`')   // Escape backticks
        .replace(/\$\{/g, '\\${'); // Escape interpolation
}

// ============================================================================
// Main
// ============================================================================

function main() {
    console.log('🔍 Extracting library types (preserving module structure)...\n');

    let outputMap = {};

    for (const lib of LIBRARIES) {
        const typesDir = getTypesDir(lib.name);
        if (!typesDir) {
            console.warn(`⚠️ Could not find types for ${lib.name}`);
            continue;
        }

        console.log(`📦 ${lib.name} -> ${typesDir}`);
        const files = findAllDtsFiles(typesDir);
        console.log(`   Found ${files.length} files`);

        for (const filePath of files) {
            // Create a virtual path for Monaco
            // e.g. "file:///node_modules/textmode.js/dist/types/index.d.ts"
            // We want to preserve the relative structure from the package root.
            // So imports like "./foo" work.

            // Calculate relative path from node_modules root
            // filePath is like "d:\project\node_modules\textmode.js\dist\types\subdir\file.d.ts"
            // We want "textmode.js/dist/types/subdir/file.d.ts"

            // We'll normalize separators to /
            const fullPathNormalized = filePath.replace(/\\/g, '/');
            const nodeModulesIndex = fullPathNormalized.lastIndexOf('node_modules/');

            if (nodeModulesIndex === -1) continue;

            const relativePathInNodeModules = fullPathNormalized.substring(nodeModulesIndex + 'node_modules/'.length);
            const virtualPath = `file:///node_modules/${relativePathInNodeModules}`;

            const content = fs.readFileSync(filePath, 'utf-8');

            outputMap[virtualPath] = content;
        }
    }

    // Generate the Global Declaration File
    // This file imports the libraries and defines the globals 't', 'osc', etc.
    const globalsContent = `
import { Textmodifier, TextmodeLayer } from 'textmode.js';
import { SynthSource, SynthParameterValue, SynthContext } from 'textmode.synth.js';

declare global {
  // Main Textmode Instance
  const t: Textmodifier;

  // Cleanup
  function onDispose(fn: () => void): void;
  
  // Tracked Timers
  function setTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearTimeout(id?: number): void;
  function setInterval(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearInterval(id?: number): void;
  function requestAnimationFrame(callback: FrameRequestCallback): number;
  function cancelAnimationFrame(id: number): void;
  function addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

  // Synth Functions (mapped from textmode.synth.js)
  // These should match the exports in textmode.synth.js
  function osc(frequency?: SynthParameterValue, sync?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function noise(scale?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function voronoi(scale?: SynthParameterValue, speed?: SynthParameterValue, blending?: SynthParameterValue): SynthSource;
  function gradient(speed?: SynthParameterValue): SynthSource;
  function solid(r?: SynthParameterValue, g?: SynthParameterValue, b?: SynthParameterValue, a?: SynthParameterValue): SynthSource;
  function shape(sides?: SynthParameterValue, radius?: SynthParameterValue, smoothing?: SynthParameterValue): SynthSource;
  function src(layer?: TextmodeLayer | { id?: string }): SynthSource;

  function char(source: SynthSource, charCount?: number): SynthSource;
  function charColor(source: SynthSource): SynthSource;
  function cellColor(source: SynthSource): SynthSource;
  function paint(source: SynthSource): SynthSource;
  
  // Array Extensions
  interface Array<T> {
    fast(speed?: number): number[];
    smooth(speed?: number): number[];
  }
}
`;

    outputMap['file:///src/live/globals.d.ts'] = globalsContent;

    const timestamp = new Date().toISOString();

    // Create the final output file content
    const fileContent = `/**
 * AUTO-GENERATED TYPE DEFINITIONS FOR MONACO INTELLISENSE
 * Generated: ${timestamp}
 */

export const typeDefinitions = ${JSON.stringify(outputMap, null, 2)};
`;

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
    console.log(`\n✅ Generated ${OUTPUT_PATH} (${(fileContent.length / 1024).toFixed(1)} KB)`);
}

main();
