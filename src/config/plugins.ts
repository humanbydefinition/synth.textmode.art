/**
 * Plugin configuration.
 * Central location for registering all available plugins.
 * Add new plugins here to make them available in the application.
 */

// Import plugins to trigger self-registration
import '../plugins/textmode';
import '../plugins/strudel';

/**
 * Initialize all core plugins.
 * Call this once during application startup.
 *
 * @example Adding a new plugin:
 * 1. Create your plugin in `src/plugins/myPlugin/`
 * 2. Add the import: `import '../plugins/myPlugin';`
 */
export function registerCorePlugins(): void {
    // Side-effect imports above handle registration.
    // This function exists to provide an explicit entry point
    // and future hook for async plugin loading.
}
