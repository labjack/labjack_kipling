console.log("ljswitchboard-kipling index.js");

const window_manager = global.lj_di_injector.get('window_manager');

/*
var UPDATE_K3_WINDOW_VERSION_NUMBER_STR = function(str) {
	win.title = 'Kipling '+str;
};
*/

const io_interface = io_manager.io_interface();

function K3_ON_APPLICATION_EXIT_LISTENER(io_interface) {
    GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = false;

    io_interface.off(io_interface.eventList.PROCESS_CLOSE);
    // console.log(JSON.stringify(['Quitting Application', GLOBAL_ALLOW_SUBPROCESS_TO_RESTART, GLOBAL_SUBPROCESS_REFERENCE]));
    try {
        if(GLOBAL_SUBPROCESS_REFERENCE) {
            GLOBAL_SUBPROCESS_REFERENCE.kill('SIGHUP');
        }
    } catch(err) {
        console.log('Error quitting subprocess', err);
    }
    console.log('Quit sub-process');
}

/*
SCRATCH PAD:
// Prevent app from closing
window_manager.windowManager.managedWindows.kipling.runInBackground = true;

// quit app.
window_manager.windowManager.managedWindows.kipling.win.close(true)
*/
const K3_EXIT_LISTENERS = {};
global.ADD_K3_EXIT_LISTENER = function (name, func) {
    K3_EXIT_LISTENERS[name] = func;
};

function DELETE_K3_EXIT_LISTENER(name) {
    delete(K3_EXIT_LISTENERS[name]);
}

function GET_ALL_K3_EXIT_LISTENERS() {
    const listeners = [];
    const keys = Object.keys(K3_EXIT_LISTENERS);
    keys.forEach(function(key) {
        listeners.push(K3_EXIT_LISTENERS[key]);
    });
    return listeners;
}

function K3_ON_APPLICATION_EXIT_WINDOW_LISTENER(enablePromise) {
    return new Promise((resolve) => {
        const asyncProcesses = GET_ALL_K3_EXIT_LISTENERS();
        async.eachSeries(
            asyncProcesses,
            function closeAppAsyncProcess(process, cb) {
                try {
                    process().then(function(res) {
                        cb();
                    }, function(err) {
                        cb();
                    }).catch(function(err) {
                        cb();
                    });
                } catch(err) {
                    // Error...
                    cb();
                }
            },
            function finishedClosingAsyncProcesses(err) {
                closeApp();
            });

        function closeApp() {
            let numWaited = 0;
            const numToWait = 1;
            function waitToClose() {
                if(numWaited < numToWait) {
                    numWaited += 1;
                    console.log('Waiting to close.....', numWaited);
                } else {
                    // Close app.
                    try {
                        if (enablePromise) {
                            K3_ON_APPLICATION_EXIT_LISTENER(io_interface);
                        } else {
                            resolve();
                        }

                    } catch(err) {
                        console.error('Error exiting things...', err);
                    }
                    window_manager.managedWindows.kipling.win.close(true);
                }
            }
            setInterval(waitToClose, 500);
        }
    });
}

window_manager.on(
    window_manager.eventList.QUITTING_APPLICATION,
    () => K3_ON_APPLICATION_EXIT_LISTENER(io_interface)
);

window_manager.on(
    window_manager.eventList.PREVENTING_WINDOW_FROM_CLOSING,
    K3_ON_APPLICATION_EXIT_WINDOW_LISTENER
);
