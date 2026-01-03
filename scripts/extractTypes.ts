/**
 * Type Extraction Script for Monaco IntelliSense
 *
 * This script extracts ALL .d.ts files from specified libraries and bundles them
 * into a JSON map of "file path" -> "content".
 *
 * Key features:
 * - Preserves module structure for internal imports to work correctly
 * - Automatically detects module augmentations (declare module 'X' { ... })
 * - INJECTS augmented members directly into original type definitions
 * - Generates a minimal globals.d.ts for live coding environment
 * - Strips @example blocks to reduce bundle size
 */
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const LIBRARIES = [
    {
        name: 'textmode.js',
        typesRoot: 'dist/types'
    },
    {
        name: 'textmode.synth.js',
        typesRoot: 'dist/types'
    }
];

const OUTPUT_PATH = 'src/editor/generatedTypes.ts';

// ============================================================================
// Types for Augmentation Tracking
// ============================================================================

interface InterfaceAugmentation {
    members: string;  // The raw interface body content
}

// Map: moduleName -> interfaceName -> augmentation info
type AugmentationMap = Map<string, Map<string, InterfaceAugmentation>>;

// ============================================================================
// Augmentation Parsing
// ============================================================================

/**
 * Parse and extract module augmentations from file content.
 * Returns the augmentations found and the content with augmentation blocks removed.
 */
function extractAugmentations(content: string, augmentations: AugmentationMap): string {
    // Regex to match: declare module 'module-name' { ... }
    const declareModuleRegex = /declare\s+module\s+['"]([^'"]+)['"]\s*\{/g;

    let result = content;
    let match: RegExpExecArray | null;
    const blocksToRemove: { start: number; end: number }[] = [];

    // Find all declare module blocks
    while ((match = declareModuleRegex.exec(content)) !== null) {
        const moduleName = match[1];
        const blockStart = match.index;
        const braceStart = match.index + match[0].length - 1;

        // Find the matching closing brace
        let braceDepth = 1;
        let pos = braceStart + 1;

        while (pos < content.length && braceDepth > 0) {
            if (content[pos] === '{') braceDepth++;
            else if (content[pos] === '}') braceDepth--;
            pos++;
        }

        const blockEnd = pos;
        const blockContent = content.substring(braceStart + 1, blockEnd - 1);

        // Extract interface declarations from this block
        extractInterfacesFromBlock(moduleName, blockContent, augmentations);

        // Mark this block for removal
        blocksToRemove.push({ start: blockStart, end: blockEnd });
    }

    // Remove blocks in reverse order to preserve positions
    blocksToRemove.sort((a, b) => b.start - a.start);
    for (const block of blocksToRemove) {
        result = result.substring(0, block.start) + result.substring(block.end);
    }

    return result;
}

/**
 * Extract interface declarations from a module augmentation block.
 */
function extractInterfacesFromBlock(
    moduleName: string,
    blockContent: string,
    augmentations: AugmentationMap
): void {
    // Regex to match interface declarations with optional JSDoc
    const interfaceRegex = /(\/\*\*[\s\S]*?\*\/\s*)?\binterface\s+(\w+)\s*\{/g;

    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(blockContent)) !== null) {
        const jsdoc = match[1] || '';
        const interfaceName = match[2];
        const braceStart = match.index + match[0].length - 1;

        // Find matching closing brace
        let braceDepth = 1;
        let pos = braceStart + 1;

        while (pos < blockContent.length && braceDepth > 0) {
            if (blockContent[pos] === '{') braceDepth++;
            else if (blockContent[pos] === '}') braceDepth--;
            pos++;
        }

        // Include JSDoc with the interface body
        const interfaceBody = jsdoc + blockContent.substring(braceStart + 1, pos - 1).trim();

        // Store the augmentation
        if (!augmentations.has(moduleName)) {
            augmentations.set(moduleName, new Map());
        }

        const moduleAugs = augmentations.get(moduleName)!;

        if (moduleAugs.has(interfaceName)) {
            // Merge with existing augmentation
            const existing = moduleAugs.get(interfaceName)!;
            existing.members += '\n' + interfaceBody;
        } else {
            moduleAugs.set(interfaceName, {
                members: interfaceBody
            });
        }
    }
}

// ============================================================================
// Type Injection
// ============================================================================

/**
 * Inject augmented members into interface/class declarations.
 * Finds matching interface/class declarations and inserts new members.
 */
function injectAugmentations(
    content: string,
    interfaceAugs: Map<string, InterfaceAugmentation>
): string {
    let result = content;

    for (const [interfaceName, aug] of interfaceAugs) {
        // Find interface or class declaration
        // Match: "interface InterfaceName" or "export interface InterfaceName" 
        // or "declare class ClassName" or "export declare class ClassName"
        const patterns = [
            new RegExp(`(export\\s+)?interface\\s+${interfaceName}\\s*(extends[^{]*)?\\{`, 'g'),
            new RegExp(`(export\\s+)?(declare\\s+)?class\\s+${interfaceName}\\s*(extends[^{]*)?(implements[^{]*)?\\{`, 'g')
        ];

        for (const pattern of patterns) {
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(result)) !== null) {
                const openBracePos = match.index + match[0].length - 1;

                // Find the closing brace of this interface/class
                let braceDepth = 1;
                let pos = openBracePos + 1;

                while (pos < result.length && braceDepth > 0) {
                    if (result[pos] === '{') braceDepth++;
                    else if (result[pos] === '}') braceDepth--;
                    pos++;
                }

                const closingBracePos = pos - 1;

                // Clean up the augmented members
                const cleanedMembers = stripExamples(aug.members);
                const formattedMembers = '\n    // Injected from textmode.synth.js\n' +
                    indentContent(cleanedMembers, 4) + '\n';

                // Inject members before the closing brace
                result = result.substring(0, closingBracePos) +
                    formattedMembers +
                    result.substring(closingBracePos);

                // Only inject once per interface name
                break;
            }
        }
    }

    return result;
}

// ============================================================================
// Global Declaration Generation
// ============================================================================

/**
 * Generate a minimal globals.d.ts for the live coding environment.
 * Uses original type names since augmentations are now injected directly.
 */
function generateGlobalsContent(): string {
    return `import { Textmodifier } from 'textmode.js';
import { SynthSource, SynthParameterValue } from 'textmode.synth.js';

declare global {
  // Main Textmode Instance
  const t: Textmodifier;

  // Cleanup
  function onDispose(fn: () => void): void;
  
  // Tracked Timers (overridden from window for resource tracking)
  function setTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearTimeout(id?: number): void;
  function setInterval(handler: TimerHandler, timeout?: number, ...args: unknown[]): number;
  function clearInterval(id?: number): void;
  function requestAnimationFrame(callback: FrameRequestCallback): number;
  function cancelAnimationFrame(id: number): void;
  function addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;

  // Synth Source Functions (re-exported as globals)
  function osc(frequency?: SynthParameterValue, sync?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function noise(scale?: SynthParameterValue, offset?: SynthParameterValue): SynthSource;
  function gradient(speed?: SynthParameterValue): SynthSource;
  function solid(r?: SynthParameterValue, g?: SynthParameterValue, b?: SynthParameterValue, a?: SynthParameterValue): SynthSource;
  function shape(sides?: SynthParameterValue, radius?: SynthParameterValue, smoothing?: SynthParameterValue): SynthSource;
  function src(layer?: { id?: string }): SynthSource;
  function char(source: SynthSource, charCount?: number): SynthSource;
  
  // Array Extensions for synth modulation
  interface Array<T> {
    fast(speed?: number): number[];
    smooth(speed?: number): number[];
  }
}
`;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Indent content by a specified number of spaces.
 */
function indentContent(content: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return content
        .split('\n')
        .map(line => line.trim() ? indent + line : line)
        .join('\n');
}

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

    const typesEntry = packageJson.types || packageJson.typings;
    if (typesEntry) {
        return path.join('node_modules', packageName, path.dirname(typesEntry));
    }

    const distTypesPath = path.join('node_modules', packageName, 'dist', 'types');
    if (fs.existsSync(distTypesPath)) return distTypesPath;

    return null;
}

/**
 * Strip @example blocks from JSDoc comments.
 */
function stripExamples(content: string): string {
    return content.replace(
        /@example[\s\S]*?(?=\s*\*\s*@[a-z]|\s*\*\/)/gi,
        ''
    );
}

// ============================================================================
// Main
// ============================================================================

function main() {
    console.log('🔍 Extracting library types with direct injection...\n');

    const augmentations: AugmentationMap = new Map();
    const fileContents: Map<string, { virtualPath: string; content: string; lib: string }> = new Map();

    // First pass: collect all files and extract augmentations
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
            const fullPathNormalized = filePath.replace(/\\/g, '/');
            const nodeModulesIndex = fullPathNormalized.lastIndexOf('node_modules/');

            if (nodeModulesIndex === -1) continue;

            const relativePathInNodeModules = fullPathNormalized.substring(nodeModulesIndex + 'node_modules/'.length);
            const virtualPath = `file:///node_modules/${relativePathInNodeModules}`;

            let content = fs.readFileSync(filePath, 'utf-8');

            // Extract augmentations and remove them from content
            content = extractAugmentations(content, augmentations);

            // Strip @example blocks
            content = stripExamples(content);

            // Store for second pass
            fileContents.set(filePath, { virtualPath, content, lib: lib.name });
        }
    }

    // Log discovered augmentations
    console.log('\n📝 Discovered module augmentations:');
    for (const [moduleName, interfaces] of augmentations) {
        console.log(`   ${moduleName}:`);
        for (const [interfaceName, aug] of interfaces) {
            const memberCount = (aug.members.match(/\w+\s*\(/g) || []).length;
            console.log(`      - ${interfaceName} (${memberCount} method(s))`);
        }
    }

    // Second pass: inject augmentations into target files
    const outputMap: Record<string, string> = {};

    console.log('\n🔧 Debug: Augmentation map keys:', [...augmentations.keys()]);

    for (const [filePath, { virtualPath, content, lib }] of fileContents) {
        let processedContent = content;

        // Check if this library is the target of any augmentations
        const libraryAugs = augmentations.get(lib);
        if (libraryAugs && libraryAugs.size > 0) {
            const before = processedContent.length;
            processedContent = injectAugmentations(processedContent, libraryAugs);
            const after = processedContent.length;
            if (before !== after) {
                console.log(`   💉 Injected augmentations into ${path.basename(filePath)} (${after - before} chars added)`);
            }
        }

        // Clean up any excessive whitespace
        processedContent = processedContent.replace(/\n{3,}/g, '\n\n').trim();

        outputMap[virtualPath] = processedContent;
    }

    // Generate minimal globals.d.ts
    const globalsContent = generateGlobalsContent();
    outputMap['file:///src/live/globals.d.ts'] = globalsContent;

    const timestamp = new Date().toISOString();

    // Create the final output file content
    const fileContent = `/**
 * AUTO-GENERATED TYPE DEFINITIONS FOR MONACO INTELLISENSE
 * Generated: ${timestamp}
 * 
 * This file contains:
 * - All .d.ts files from textmode.js and textmode.synth.js
 * - Augmented methods INJECTED directly into original type definitions
 * - Minimal global declarations for the live coding environment
 */

export const typeDefinitions: Record<string, string> = ${JSON.stringify(outputMap, null, 2)};
`;

    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
    console.log(`\n✅ Generated ${OUTPUT_PATH} (${(fileContent.length / 1024).toFixed(1)} KB)`);
}

main();
