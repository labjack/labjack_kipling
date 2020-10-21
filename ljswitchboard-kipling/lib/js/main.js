



const splashScreenUpdater = global.lj_di_injector.get('splashScreenUpdater');
const window_manager = global.lj_di_injector.get('window_manager');


window_manager.on(
    window_manager.eventList.QUITTING_APPLICATION,
    () => K3_ON_APPLICATION_EXIT_LISTENER(io_interface)
);

// Prevent application from auto-closing so that we can have an asynchronous hook
// aka close app manually.
kiplingWindow.runInBackground = true;

window_manager.on(
    window_manager.eventList.PREVENTING_WINDOW_FROM_CLOSING,
    K3_ON_APPLICATION_EXIT_WINDOW_LISTENER
);

// win.showDevTools();
// Start the application
splashScreenUpdater.update('Starting IO Manager');

async function startupKipling() {
// Start the IO Manager
    try {
        await startIOManager(io_interface, splashScreenUpdater);
    } catch (e) {
        await handleError(e, 'startIOManager');
    }

// Perform other initialization routines
    try {
        await performRemainingInitializationRoutines();
    } catch (e) {
        await handleError(e, 'performRemainingInitializationRoutines');
    }

// Render the module chrome window
    try {
        await MODULE_CHROME.loadModuleChrome();
    } catch (e) {
        await handleError(e, 'MODULE_CHROME.loadModuleChrome');
    }

// Initialize the file browser utility
    try {
        await FILE_BROWSER.initialize();
    } catch (e) {
        await handleError(e, 'FILE_BROWSER.initialize');
    }

// Hide the splash screen & core windows & display the kipling window
    try {
        await showKiplingWindow(window_manager, splashScreenUpdater);
    } catch (e) {
        await handleError(e, 'showKiplingWindow');
    }

// Load Kipling background tasks
    try {
        await TASK_LOADER.loadTasks();
    } catch (e) {
        await handleError(e, 'TASK_LOADER.loadTasks');
    }
}

startupKipling();
