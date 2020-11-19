const package_loader = global.package_loader;
const splashScreenUpdater = package_loader.getPackage('splashScreenUpdater');
const window_manager =  package_loader.getPackage('window_manager');
const kiplingWindow = window_manager.getWindow('kipling');
const io_manager = package_loader.getPackage('io_manager');
const io_interface = io_manager.io_interface();

// Prevent application from auto-closing so that we can have an asynchronous hook
// aka close app manually.
kiplingWindow.runInBackground = true;

// win.showDevTools();
// Start the application
splashScreenUpdater.update('Starting IO Manager', 'info');

function handleError(err, msg) {
    let reportError = true;
    if (err) {
        if (err.loadError) {
            reportError = false;
        }
    }
    return new Promise((resolve, reject) => {
        if (reportError) {
            console.error('Error on step', msg);
            reject({
                'loadError': true,
                'message': 'Error on step: ' + msg.toString(),
                'errorInfo': err,
            });
        } else {
            reject(reportError);
        }
    });
}

async function performRemainingInitializationRoutines() {
    const managers = {
        'keyboard': global.KEYBOARD_EVENT_HANDLER,
        'mouse': global.MOUSE_EVENT_HANDLER,
        'zoom': global.WINDOW_ZOOM_MANAGER,
    };

    await global.KEYBOARD_EVENT_HANDLER.init(managers);
    await global.WINDOW_ZOOM_MANAGER.init();
    await global.MOUSE_EVENT_HANDLER.init({
        keyboard: global.KEYBOARD_EVENT_HANDLER,
        zoom: global.MOUSE_EVENT_HANDLER
    });
}

function showKiplingWindow(window_manager, splashScreenUpdater) {
    return new Promise((resolve, reject) => {
        window_manager.showWindow('kipling');

        // Try and execute tests
        let isKiplingTester = false;
        const windows = window_manager.getWindows();
        windows.forEach(function (win) {
            if (win === 'kipling_tester') {
                isKiplingTester = true;
            }
        });
        if (isKiplingTester) {
            window_manager.showWindow('kipling_tester');
            const testerWin = window_manager.managedWindows.kipling_tester.win;
            testerWin.focus();
            const testerWindow = testerWin.window;
            testerWindow.runTests();
        }
        resolve();
    });
}

function ioManagerMonitor(data, io_interface) {
    if (GLOBAL_ALLOW_SUBPROCESS_TO_RESTART) {
        console.log('io_manager Close Event detected, restarting', data);
        let errorString = '<p>';
        errorString += 'Kipling\'s sub-process was closed or has crashed and ';
        errorString += 'is being restarted.';
        errorString += '</p>';
        errorString += '<p>';
        errorString += 'Current time is: ' + (new Date()).toString();
        errorString += '</p>';

        showCriticalAlert(errorString);
        console.log('Critical alert errorString', errorString);
        if (global.MODULE_LOADER) {
            global.MODULE_LOADER.loadModuleByName('crash_module');
        }
        io_interface.initialize()
            .then(bundle => saveGlobalSubprocessReference(bundle, io_interface))
            .then(() => global.MODULE_CHROME.reloadModuleChrome());
    } else {
        console.log('subprocess exited and not restarting');
    }
}

let GLOBAL_SUBPROCESS_REFERENCE;
let GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;

// Add monitors to the other error events.
// io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
// io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
// io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

function getIOManagerListener(eventName) {
    return function ioInterfaceProcessMonitor(data) {
        console.log('Received event from io_interface:', eventName, data, (new Date()).toString());
    };
}

function saveGlobalSubprocessReference(bundle, io_interface) {
    GLOBAL_SUBPROCESS_REFERENCE = io_interface.mp.masterProcess.getSubprocess();
    // console.log('subprocess pid', GLOBAL_SUBPROCESS_REFERENCE.pid);
    return Promise.resolve(bundle);
}

async function startIOManager(io_interface, splashScreenUpdater) {
    console.log('startIOManager');

    // Attach monitor
    GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;
    io_interface.on(io_interface.eventList.PROCESS_CLOSE, data => ioManagerMonitor(data, io_interface));

    // Add monitors to the other error events.
    io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
    io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
    io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

    try {
        const bundle = await io_interface.initialize();
        return await saveGlobalSubprocessReference(bundle, io_interface);
    } catch (data) {
        let remainingMessage = '';

        if (data.code === 'EPERM') {
            remainingMessage += ', Permissions';
        } else {
            console.log(typeof (data.code), data.code);
            remainingMessage += ', Subprocess Failed';
        }
        splashScreenUpdater.update('Failed to initialize IO Manager' + remainingMessage, 'fail');
    }
}


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
        await global.MODULE_CHROME.loadModuleChrome();
    } catch (e) {
        await handleError(e, 'MODULE_CHROME.loadModuleChrome');
    }

    // Initialize the file browser utility
    try {
        await global.FILE_BROWSER.initialize();
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
        await global.TASK_LOADER.loadTasks();
    } catch (e) {
        await handleError(e, 'TASK_LOADER.loadTasks');
    }
}

startupKipling()
    .catch(err => {
        console.error(err);
    });
