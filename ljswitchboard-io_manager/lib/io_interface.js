'use strict';

/**
 * This file defines the public interface to the io_manager.  It provides object
 * references that allow programs to communicate with the io_manager_process
 */
const EventEmitter = require('events').EventEmitter;
const process_manager = require('process_manager');
const fs = require('fs');
const path = require('path');
const io_error_constants = require('./io_error_constants');
const get_cwd = require('./common/get_cwd');

// Include the io controllers
const driver_controller = require('./controllers/driver_controller');
const device_controller = require('./controllers/device_controller');

// Include the LJM installation verification function
const ljmCheck = require('ljswitchboard-ljm_driver_checker');

// Include the checkRequirements function
const npm_build_check = require('./common/npm_build_check');

const constants = require('./common/constants');
const io_endpoint_key = constants.io_manager_endpoint_key;

function runGarbageCollector() {
	if (global.gc) {
		if (typeof(global.gc) === 'function') {
			global.gc();
		}
	}
}
const io_interface_gc = setInterval(runGarbageCollector, 5000);

class IOInterface extends EventEmitter {

	constructor() {
		super();

		this.mp = null;
		this.mp_event_emitter = null;
		this.oneWayMessageListeners = {};

		this.driver_controller = null;
		this.device_controller = null;
		this.file_io_controller = null;

		this.DEBUG_SUBPROCESS_START = false;

		this.eventList = {
			'PROCESS_ERROR': 'PROCESS_ERROR',
			'PROCESS_DISCONNECT': 'PROCESS_DISCONNECT',
			'PROCESS_EXIT': 'PROCESS_EXIT',
			'PROCESS_CLOSE': 'PROCESS_CLOSE',
		};

		this.callFunc = null;
		this.sendReceive = null;
		this.sendMessage = null;
		this.send = null;
	}

	printStartMsg() {
		if (this.DEBUG_SUBPROCESS_START) {
			console.log.apply(console, arguments);
		}
	}

	createDriverController() {
		this.driver_controller = new driver_controller.createNewDriverController(this);
	}

	createDeviceController() {
		this.device_controller = new device_controller.createNewDeviceController(this);
	}

	checkOneWayEndpoint(m) {
		if (this.oneWayMessageListeners[m.endpoint]) {
			return Promise.resolve(m);
		} else {
			return Promise.reject(m);
		}
	}

	async handleOneWayMessageErrors(m) {
		const msg = '* io_interface oneWayMessageError: ' + JSON.stringify(m);
		console.error(msg);
		throw msg;
	}

	async delegateOneWayMessage(m) {
		try {
			this.oneWayMessageListeners[m.endpoint](m.data);
		} catch(err) {
			const msg = '* io_interface oneWayMessageError: ' + JSON.stringify(m);
			console.error(msg);
			throw msg;
		}
	}

	oneWayMessageListener(m) {
		console.log('io_interface, oneWayMessageListener', m);
		this.checkOneWayEndpoint(m).then(m => this.delegateOneWayMessage(m), m => this.handleOneWayMessageErrors(m));
	}

	async saveLink(link) {
		this.callFunc = link.callFunc;
		this.sendReceive = link.sendReceive;
		this.sendMessage = link.sendMessage;
		this.send = link.send;
	}

	async initInternalMessenger() {
		const link = await this.establishLink(io_endpoint_key, (m) => console.log("* io_interface internalListener:", m));
		await this.saveLink(link);
	}

	getRegisteredEndpoints() {
		return this.callFunc('getRegisteredEndpoints');
	}

	/**
	 * The checkLabJackM function verifies that the LabJack LJM driver is
	 * properly installed on a users machine.  If the driver isn't installed
	 * properly the initialization routine for the io_interface will fail.
	 */
	checkLabJackM() {
		this.printStartMsg('in checkLabJackM');
		return ljmCheck.verifyLJMInstallation();
	}

	/**
	 * The checkRequirements function verifies that the labjack-nodejs library
	 * has been properly included by npm and has been built for the proper os.
	 * It also verifies that the proper node_binary is going to be executed.
	 * If anything isn't configured/installed properly the initialization
	 * routine for the io_interface will fail.
	 *
	 * cwdOverride: object, The current working directory override object.
	 * passedRequirements: object, An object passed into the function by the
	 *     qExec function that contains all of the previous results from the
	 *     io_interface initialization routine.
	 */
	checkRequirements(cwdOverride, passedResults) {
		this.printStartMsg('in checkRequirements');
		return npm_build_check.checkRequirements(cwdOverride, passedResults);
	}

	/**
	 * Initializing the io_interface will initialize a new master_process
	 * instance (as mp), save it as well as its event_emitter and start a new
	 * child process.  Once this is done it will create and initialize the
	 * various manager processes that make up the io_interface.
	**/
	_innerGetNodePath(passedResult, passedResults) {
		this.printStartMsg('in _innerGetNodePath');

		return new Promise((resolve, reject) => {
			// Collect information about the process
			let isOkToRun = true;
			let isValidInstance = true;
			const platform = process.platform;
			const errors = [];

			// Determine what OS is being used.
			const os = {
				'win32': 'win32',
				'darwin': 'darwin',
				'linux': 'linux',
				'freebsd': 'linux',
				'sunos': 'linux'
			}[platform];

			// Determine the exeName that should be executed vased off the OS
			// selection.  TODO:
			const exeName = {
				'win32': 'node.exe',
				'darwin': 'node',
				'linux': 'node'
			}[os];

			// If a defined exeName has not been found, prevent the subprocess from
			// starting.
			if (typeof(exeName) === 'undefined') {
				console.error(
					'OS:',
					os,
					'is not currently supported by the io_manager.  ' +
					'Should be a simple fix for linux computers.'
				);
				isValidInstance = false;
				isOkToRun = false;
				errors.push('No suitable executable name found');
			}

			// If the os that the labjack-nodejs library was built for isn't
			// the current platform, prevent the subprocess from starting.
			if (os !== passedResult.os) {
				isOkToRun = false;
				errors.push('Wrong OS detected');
				console.log(os, passedResult);
			}

			// If the detected architecture is ia32 and the sub-process is x64 then
			// prevent the subprocess from starting as there will likely be issues.
			let arch = process.arch;
			// arch = 'x64';
			if (arch === 'ia32') {
				if (passedResult.arch === 'x64') {
					// If the labjack-nodejs library is built for x64 and we are a
					// x64 machine, AND we started as a 32bit instance of node, then
					// over-write the arch to be x64.  Otherwise there is nothing we
					// can do but force an error. (Fix only for win32 OS, not sure
					// how to detect this on mac/linux).
					if (os === 'win32') {
						if (process.env['PROGRAMFILES(x86)']) {
							arch = 'x64';
							console.error(
								'**** forcing sub-process to run in 64bit mode ****'
							);
						} else {
							isOkToRun = false;
							errors.push(
								'Wrong architecture detected, current arch is: ' +
								arch +
								', lj-nodejs is built for: ' +
								passedResult.arch
							);
						}
					} else {
						isOkToRun = false;
						errors.push(
							'Wrong architecture detected, current arch is: ' +
							arch +
							', lj-nodejs is built for: ' +
							passedResult.arch
						);
					}

				}
			}

			// Save the root directory of the io_manager library
			const resolvedCWD = get_cwd.getCWD();
			const rootDir = passedResults.cwdOverride ? passedResults.cwdOverride : resolvedCWD;

			// Define the version of the node binary to look for
			// const version = '0_10_33';
			// Force execution of node 0_10_35
			// version = '0_10_35';
			const version = {
				'win32': '8_9_4',
				'darwin': '8_9_4',
				'linux': '8_9_4',
			}[os];

			// If the labjack-nodejs lib`rary isn't built for the version defined
			// then prevent the subprocess from starting.
			if (version !== passedResult.node_version) {
				console.warn(
					'**** The node version being started does not match the ' +
					'one that the labjack-nodejs library was built for. ****'
				);
				console.warn('**** Executed version', version, '****');
				console.warn('**** Built for version', passedResult.node_version, '****');
				// Disable for now, Chris: 01/23/2015
				// isOkToRun = false;
				// errors.push('Wrong node_version detected');
			}

			// Define the base directory to look for the node binaries in
			const binariesDir = 'node_binaries';

			const callerPath = process.execPath;
			const callerName = path.basename(callerPath);

			const nodeBinaryPath = path.join(
				rootDir,
				binariesDir,
				platform,
				arch,
				version,
				exeName
			);

			const retData = {
				'path': nodeBinaryPath,
				'cwd': rootDir,
				'callerName': callerName
			};

			const exists = fs.existsSync(nodeBinaryPath);
			retData.exists = exists;
			if (exists) {
				if (isOkToRun) {
					resolve(retData);
				} else {
					retData.errors = errors;
					reject(retData);
				}
			} else {
				errors.push('Node binary does not exist');
				retData.errors = errors;
				reject(retData);
			}
		});
	}

	/**
	 * the innerInitialize function only gets executed when all
	 * checks/verifications have passed.  It starts the sub-process and reports
	 * an error code with a result message if the the sub-process fails to start
	 * properly.  It is still possible for this function to fail, this will
	 * happen in there is a syntax error/require error somewhere in the
	 * io_delegator.js file/its requirements.
	 */
	async innerInitialize(info, passedResults) {
		this.printStartMsg('in innerInitialize');
		// If debugging is enabled, print out information about that process
		// that is about to start.
		if (passedResults.debugProcess) {
			console.log('  - Initialize Data:');
			const infoKeys = Object.keys(info);
			infoKeys.forEach((key) => {
				console.log('    - ' + key + ': ' + JSON.stringify(info[key]));
			});
		}

		this.oneWayMessageListeners = {};
		this.mp = new process_manager.master_process();
		this.mp_event_emitter = this.mp.init(m => this.oneWayMessageListener(m));

		// Attach a variety of event listeners to verify that the sub-process
		// starts properly. If a user enables debugging.
		this.mp_event_emitter.on('error', (data) => {
			if (passedResults.debugProcess) {
				console.log('Error Received', data);
			}
			this.emit(this.eventList.PROCESS_ERROR, data);
		});
		this.mp_event_emitter.on('exit', (data) => {
			if (passedResults.debugProcess) {
				console.log('exit Received', data);
			}
			this.emit(this.eventList.PROCESS_EXIT, data);
		});
		this.mp_event_emitter.on('close', (data) => {
			if (passedResults.debugProcess) {
				console.log('close Received', data);
			}
			this.emit(this.eventList.PROCESS_CLOSE, data);
		});
		this.mp_event_emitter.on('disconnect', (data) => {
			if (passedResults.debugProcess) {
				console.log('disconnect Received', data);
			}
			this.emit(this.eventList.PROCESS_DISCONNECT, data);
		});

		// Clear the one-way-listeners object that is used for routing
		// one-way messages via send or sendMessage to the controllers.

		// Create Controllers
		this.createDriverController();
		this.createDeviceController();

		const options = {
			'execPath': info.path,
			'cwd': info.cwd,
			'spawnChildProcess': false,
			'debug_mode': false,
			'execArgv': ['-expose-gc'],
			'masterPID': process.pid,
			'callStack': new Error().stack,
		};


		// Detect if the current process is node-webkit or node via checking for
		// a declared version of node-webkit.
		if (!!process.versions['electron']) {
			delete options.execPath;

			if (passedResults.stdinListener) {
				options.stdinListener = passedResults.stdinListener;
			} else {
				options.stdinListener = (data) => {
					console.log(data.toString());
				};
			}
			if (passedResults.stderrListener) {
				options.stderrListener = passedResults.stderrListener;
			} else {
				options.stderrListener = (data) => {
					console.error(data.toString());
				};
			}
		} else
		if (process.versions['node-webkit']) {
			options.silent = true;
			if (passedResults.stdinListener) {
				options.stdinListener = passedResults.stdinListener;
			} else {
				options.stdinListener = (data) => {
					console.log(data.toString());
				};
			}
			if (passedResults.stderrListener) {
				options.stderrListener = passedResults.stderrListener;
			} else {
				options.stderrListener = (data) => {
					console.error(data.toString());
				};
			}
		} else {
			if (passedResults.silent) {
				options.silent = passedResults.silent;
			}
			if (passedResults.stdinListener) {
				options.stdinListener = passedResults.stdinListener;
			}
			if (passedResults.stderrListener) {
				options.stderrListener = passedResults.stderrListener;
			}
		}

		// Build a direct-path reference for the io_delegator.js file.  Relative
		// path's don't work very well when starting from node-webkit and the
		// ljswitchboard project.
		this.printStartMsg('Starting sub-process');
		// Start the subprocess.

		try {
			console.log('bbb1', options);
			await this.mp.qStart(path.join(info.cwd, 'lib/io_delegator.js'), options);
			console.log('bbb2');
		} catch (err) {
			console.error('Failed to start subprocess', err);
			const code = err.error;
			err.errorMessage = io_error_constants.parseError(code);
			throw err;
		}

		await this.initInternalMessenger();

		await this.driver_controller.init();
		await this.device_controller.init();
	}

	async initialize(options) {
		const results = {};

		// Check to see if the cwd is being over-ridden.  If so, save it into
		// the results object for the initialization functions to use.
		if (options) {
			// If the options argument was supplied copy over any relevant
			// options to the results object.
			if (options.cwdOverride) {
				results.cwdOverride = options.cwdOverride;
			}
			if (options.silent) {
				results.silent = options.silent;
			}
			if (options.stdinListener) {
				results.stdinListener = options.stdinListener;
			}
			if (options.stderrListener) {
				results.stderrListener = options.stderrListener;
			}

			// If a user defined the debug flag print out information about the
			// currently running process.
			if (options.debugProcess) {
				console.log('Initializing sub-process');
				console.log('Node Version', process.versions.node);
				console.log('Exec Path', process.execPath);
				console.log('');
			}
		}

		// For reference, qExec is in charge of passing the results object to
		// each of the functions that get called and any required results to
		// functions after the initial function.
		this.printStartMsg('Starting Initialization Procedure');

		const passedResults = {};
		try {
			// Check to make sure labjackm is properly installed
			const cwdOverride = await this.checkLabJackM();

			// Check to make sure that the io_manager has been built for this os/node arch. etc.
			const requirements = await this.checkRequirements(cwdOverride, passedResults);

			// Get various parameters required to start the subprocess
			const info = await this._innerGetNodePath(requirements, passedResults);

			// Initialize the subprocess
			await this.innerInitialize(info, passedResults);
		} catch (err) {
			console.error('io_interface error', err);
			process.exit();
			throw err;
		}
	}

	establishLink(endpoint, listener) {
		const sendReceive = (data) => this.mp.sendReceive({ endpoint, data });
		const sendMessage = (data) => this.mp.sendMessage({ endpoint, data });
		const send = (data) => this.mp.send(endpoint, data);
		const callFunc = (name, argList, options) => {
			const funcName = name ? name : '';
			const funcArgs = argList ? argList : [];
			return sendReceive({
				'func': funcName,
				'args': funcArgs,
				'options': options
			});
		};

		this.mp_event_emitter.on(endpoint, listener);
		this.oneWayMessageListeners[endpoint] = listener;

		return Promise.resolve({
			'callFunc': callFunc,
			'sendReceive': sendReceive,
			'sendMessage': sendMessage,
			'send': send
		});
	}

	destroy() {
		return new Promise((resolve, reject) => {

		clearInterval(io_interface_gc);

		this.mp.qStop()
		.then(resolve);

		});
	}

	getDriverController() {
		return this.driver_controller;
	}

	getDeviceController() {
		return this.device_controller;
	}

	getFileIOController() {
		return this.file_io_controller;
	}
}

let IO_INTERFACE;
exports.createIOInterface = () => {
	if (IO_INTERFACE) {
		return IO_INTERFACE;
	} else {
		IO_INTERFACE = new IOInterface();
		return IO_INTERFACE;
	}
};
