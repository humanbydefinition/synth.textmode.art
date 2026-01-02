import './styles.css';
import { App } from './app';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    // Expose for debugging in dev mode
    if (import.meta.env.DEV) {
        (window as unknown as { app: App }).app = app;
    }
});
