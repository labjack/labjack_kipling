'use strict';

const async = require('async');
const {loadResources} = require('./resources');

let GLOBAL_SUBPROCESS_REFERENCE;
let GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;

/*
var UPDATE_K3_WINDOW_VERSION_NUMBER_STR = function(str) {
	win.title = 'Kipling '+str;
};
*/

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
function ADD_K3_EXIT_LISTENER(name, func) {
	K3_EXIT_LISTENERS[name] = func;
}

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
				// Close app.
				// K3_ON_APPLICATION_EXIT_LISTENER(io_interface);
				// window_manager.windowManager.managedWindows.kipling.win.close(true);
				closeApp();
			});

		function closeApp() {
			var interval;
			var numWaited = 0;
			var numToWait = 1;
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
			interval = setInterval(waitToClose, 500);
		}
	});
}

function performRemainingInitializationRoutines() {
	return new Promise((resolve, reject) => {
		const managers = {
			'keyboard': KEYBOARD_EVENT_HANDLER,
			'mouse': MOUSE_EVENT_HANDLER,
			'zoom': WINDOW_ZOOM_MANAGER,
		};

		KEYBOARD_EVENT_HANDLER.init(managers)
			.then(WINDOW_ZOOM_MANAGER.init)
			.then(MOUSE_EVENT_HANDLER.init)
			.then(resolve, reject);
	});
}

function showKiplingWindow(window_manager, splashScreenUpdater) {

	return new Promise((resolve, reject) => {
		splashScreenUpdater.update('Finished');
		window_manager.hideWindow('core');
		// window_manager.showWindow('core');
		window_manager.hideWindow('main');
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

// Add monitors to the other error events.
// io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
// io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
// io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

function getIOManagerListener(eventName) {
	return function ioInterfaceProcessMonitor(data) {
		console.log('Recieved event from io_interface:', eventName, data, (new Date()).toString());
	};
}

function saveGlobalSubprocessReference(bundle, io_interface) {
	GLOBAL_SUBPROCESS_REFERENCE = io_interface.mp.masterProcess.getSubprocess();
	// console.log('subprocess pid', GLOBAL_SUBPROCESS_REFERENCE.pid);
	return Promise.resolve(bundle);
}

function startIOManager(io_interface, splashScreenUpdater) {
	return new Promise((resolve, reject) => {

		function reportIOInitializationError(data) {
			console.error('io_interface.initialize error:', data);

			let remainingMessage = '';

			if (data.code === 'EPERM') {
				remainingMessage += ', Permissions';
			} else {
				console.log(typeof (data.code), data.code);
				remainingMessage += ', Subprocess Failed';
			}
			splashScreenUpdater.update('Failed to initialize IO Manager' + remainingMessage);
		}
		// Attach monitor
		GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;
		io_interface.on(io_interface.eventList.PROCESS_CLOSE, data => ioManagerMonitor(data, io_interface));

		// Add monitors to the other error events.
		io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
		io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
		io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

		io_interface.initialize()
			.then(bundle => saveGlobalSubprocessReference(bundle, io_interface), reportIOInitializationError)
			.then(resolve, reject);
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
		if (MODULE_LOADER) {
			MODULE_LOADER.loadModuleByName('crash_module');
		}
		io_interface.initialize()
			.then(bundle => saveGlobalSubprocessReference(bundle, io_interface))
			.then(MODULE_CHROME.reloadModuleChrome);
	} else {
		console.log('subprocess exited and not restarting');
	}
}

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

exports.info = {
	'type': 'nwApp',
	'main': 'lib/index.html'
};

exports.initializePackage = function (injector) {
	console.log('Kipling initializePackage');
	const window_manager = injector.get('window_manager');
	const package_loader = injector.get('package_loader');
	const static_files = package_loader.getPackage('static_files');
	const io_manager = package_loader.getPackage('io_manager');
	const splashScreenUpdater = injector.get('splashScreenUpdater');

	const io_interface = io_manager.io_interface();

	window_manager.on(window_manager.eventList.OPENED_WINDOW, async (name) => {
		if (name !== 'kipling') return;

		const kiplingWindow = window_manager.getWindow('kipling');
		await loadResources(kiplingWindow.win, static_files);

	});
};
