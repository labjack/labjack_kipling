/**
 * This file defines the public interface to the io_manager.  It provides object
 * references that allow programs to communicate with the io_manager_process
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var process_manager = require('process_manager');
var q = require('q');
var fs = require('fs');
var path = require('path');
var io_error_constants = require('./io_error_constants');
var get_cwd = require('./common/get_cwd');

// Include the io controllers
var driver_controller = require('./controllers/driver_controller');
var device_controller = require('./controllers/device_controller');
var logger_controller = require('./controllers/logger_controller');
var file_io_controller = require('./controllers/file_io_controller');

// Include the LJM installation verification function
var ljmCheck = require('ljswitchboard-ljm_driver_checker');

// Include the checkRequirements function
var npm_build_check = require('./common/npm_build_check');

var ioDelegatorPathFromRoot = 'lib/io_delegator.js';
var ioDelegatorPath = './' + ioDelegatorPathFromRoot;
var constants = require('./common/constants');
var io_endpoint_key = constants.io_manager_endpoint_key;

function createIOInterface() {
	this.mp = null;
	this.mp_event_emitter = null;
	this.oneWayMessageListeners = {};

	this.driver_controller = null;
	this.device_controller = null;
	this.logger_controller = null;
	this.file_io_controller = null;

	this.eventList = {
		'PROCESS_ERROR': 'PROCESS_ERROR',
		'PROCESS_DISCONNECT': 'PROCESS_DISCONNECT',
		'PROCESS_EXIT': 'PROCESS_EXIT',
		'PROCESS_CLOSE': 'PROCESS_CLOSE',
	};
	var createDriverController = function() {
		self.driver_controller = new driver_controller.createNewDriverController(self);
	};
	var createDeviceController = function() {
		self.device_controller = new device_controller.createNewDeviceController(self);
	};
	var createLoggerController = function() {
		self.logger_controller = new logger_controller.createNewLoggerController(self);
	};
	var createFileIOController = function() {
		self.file_io_controller = new file_io_controller.createNewFileIOController(self);
	};

	var getDriverConstants = function(bundle) {
		var defered = q.defer();
		var onSucc = function() {
			defered.resolve(bundle);
		};
		var onErr = function() {
			defered.reject(bundle);
		};

		saveDriverConstants()
		.then(onSucc, onErr);
		return defered.promise;
	};
	var saveDriverConstants = function(driverConstants) {
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	};

	var callFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	var internalListener = function(m) {
		console.log("* io_interface internalListener:", m);
	};
	var checkOneWayEndpoint = function(m) {
		var defered = q.defer();
		if(self.oneWayMessageListeners[m.endpoint]) {
			defered.resolve(m);
		} else {
			defered.reject(m);
		}
		return defered.promise;
	};
	var handleOneWayMessageErrors = function(m) {
		var defered = q.defer();
		var msg = '* io_interface oneWayMessageError: ' + JSON.stringify(m);
		console.error(msg);
		defered.reject(msg);
		return defered.promise;
	};
	var delegateOneWayMessage = function(m) {
		var defered = q.defer();
		try {
			self.oneWayMessageListeners[m.endpoint](m.data);
			defered.resolve();
		} catch(err) {
			var msg = '* io_interface oneWayMessageError: ' + JSON.stringify(m);
			console.error(msg);
			defered.reject(msg);
		}
		return defered.promise;
	};
	var oneWayMessageListener = function(m) {
		console.log('io_interface, oneWayMessageListener', m);
		checkOneWayEndpoint(m)
		.then(delegateOneWayMessage, handleOneWayMessageErrors);
	};

	var saveLink = function(link) {
		var defered = q.defer();

		callFunc = link.callFunc;
		sendReceive = link.sendReceive;
		sendMessage = link.sendMessage;
		send = link.send;

		defered.resolve();
		return defered.promise;
	};

	var initInternalMessenger = function() {
		var defered = q.defer();
		self.establishLink(io_endpoint_key, internalListener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};

	this.getRegisteredEndpoints = function() {
		return callFunc('getRegisteredEndpoints');
	};
	this.testOneWayMessage = function() {
		var defered = q.defer();
		send("poke io_delegator");
		setImmediate(function() {
			defered.resolve();
		});
		return defered.promise;
	};

	/**
	 * qExec is a function that aids in initializing the io_interface.  It saves
	 * the results from each function call and allows each function call to be
	 * passed data from a previously called function.  This allows for a final
	 * 'defered' function call to return a plethora of error/debugging 
	 * information.
	 * func: function, The function that should be called.
	 * name: string, The name of the function that should be called.  Also used
	 *     to store the function call's results to the results object.
	 * passResults: string, The name of the previously called function's results
	 *     that need to get passed into the function being executed. 
	 */
	var qExec = function(func, name, passResults) {
		var execFunc = function(results) {
			var defered = q.defer();
			var keys = Object.keys(results);
			
			// Get previous function call's results & pass them along if 
			// necessary
			var inputData;
			if(passResults) {
				if(passResults !== '') {
					if(keys.indexOf(passResults) >= 0) {
						inputData = results[passResults].result;
					}
				}
			}

			// Execute the function
			func(inputData, results)
			.then(function(res) {
				var result = {
					'name': name,
					'isError': false,
					'result': res
				};
				results[name] = result;
				defered.resolve(results);
			}, function(err) {
				var result = {
					'name': name,
					'isError': true,
					'result': err
				};
				results[name] = result;
				results.failedStep = name;
				results.faildStepData = result.result;
				defered.reject(results);
			});
			return defered.promise;
		};
		return execFunc;
	};

	/**
	 * The checkLabJackM function verifies that the LabJack LJM driver is 
	 * properly installed on a users machine.  If the driver isn't installed
	 * properly the initialization routine for the io_interface will fail.
	 */
	var checkLabJackM = function() {
		var defered = q.defer();
		ljmCheck.verifyLJMInstallation()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

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
	var checkRequirements = function(cwdOverride, passedRequirements) {
		var defered = q.defer();
		npm_build_check.checkRequirements(cwdOverride, passedRequirements)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	/**
	 * Initializing the io_interface will initialize a new master_process
	 * instance (as mp), save it as well as its event_emitter and start a new
	 * child process.  Once this is done it will create and initialize the
	 * various manager processes that make up the io_interface.
	**/
	var innerGetNodePath = function(passedResult, passedResults) {
		var defered = q.defer();

		// Collect information about the process
		var isOkToRun = true;
		var isValidInstance = true;
		var platform = process.platform;
		var errors = [];

		// Determine what OS is being used.
		var os = {
		    'win32': 'win32',
		    'darwin': 'darwin',
		    'linux': 'linux',
		    'freebsd': 'linux',
		    'sunos': 'linux'
		}[platform];

		// Determine the exeName that should be executed vased off the OS
		// selection.  TODO:
		var exeName = {
			'win32': 'node.exe',
			'darwin': 'node'
		}[os];


		// If a defined exeName has not been found, prevent the subprocess from
		// starting.
		if(typeof(exeName) === 'undefined') {
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
		if(os != passedResult.os) {
			isOkToRun = false;
			errors.push('Wrong OS detected');
			console.log(os, passedResult);
		}

		// If the detected architecture is ia32 and the sub-process is x64 then
		// prevent the subprocess from starting as there will likely be issues.
		var arch = process.arch;
		// arch = 'x64';
		if(arch === 'ia32') {
			if(passedResult.arch === 'x64') {
				// If the labjack-nodejs library is built for x64 and we are a
				// x64 machine, AND we started as a 32bit instance of node, then
				// over-write the arch to be x64.  Otherwise there is nothing we
				// can do but force an error. (Fix only for win32 OS, not sure 
				// how to detect this on mac/linux).
				if(os === 'win32') {
					if(process.env['PROGRAMFILES(x86)']) {
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
		var resolvedCWD = get_cwd.getCWD();
		var rootDir;
		if(passedResults.cwdOverride) {
			rootDir = passedResults.cwdOverride;
		} else {
			rootDir = resolvedCWD;
		}


		// Define the version of the node binary to look for
		var version = '0_10_33';
		// Force execution of node 0_10_35
		// version = '0_10_35';

		// If the labjack-nodejs lib`rary isn't built for the version defined
		// then prevent the subprocess from starting.
		if(version != passedResult.node_version) {
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
		var binariesDir = 'node_binaries';

		var callerPath = process.execPath;
		var callerName = path.basename(callerPath);

		var nodeBinaryPath = path.join(
			rootDir,
			binariesDir,
			platform,
			arch,
			version,
			exeName
		);

		var retData = {
			'path': nodeBinaryPath,
			'cwd': rootDir,
			'callerName': callerName
		};

		fs.exists(nodeBinaryPath, function(exists) {
			retData.exists = exists;
			if(exists) {
				if(isOkToRun) {
					defered.resolve(retData);
				} else {
					retData.errors = errors;
					defered.reject(retData);
				}
			} else {
				errors.push('Node binary does not exist');
				retData.errors = errors;
				defered.reject(retData);
			}
		});
		return defered.promise;
	};

	/**
	 * the innerInitialize function only gets executed when all 
	 * checks/verifications have passed.  It starts the sub-process and reports
	 * an error code with a result message if the the sub-process fails to start
	 * properly.  It is still possible for this function to fail, this will 
	 * happen in there is a syntax error/require error somewhere in the 
	 * io_delegator.js file/its requirements.
	 */
	var innerInitialize = function(info, passedResults) {
		var defered = q.defer();
		// If debugging is enabled, print out information about that process
		// that is about to start.
		if(passedResults.debugProcess) {
			console.log('  - Initialize Data:');
			var infoKeys = Object.keys(info);
			infoKeys.forEach(function(key) {
				console.log('    - ' + key + ': ' + JSON.stringify(info[key]));
			});
	}

		self.mp = null;
		self.mp_event_emitter = null;
		self.oneWayMessageListeners = null;

		delete self.mp;
		delete self.mp_event_emitter;
		delete self.oneWayMessageListeners;

		self.mp = new process_manager.master_process();
		self.mp_event_emitter = self.mp.init(oneWayMessageListener);

		// Attach a variety of event listeners to verify that the sub-process
		// starts properly. If a user enables debugging.
		self.mp_event_emitter.on('error', function(data) {
			if(passedResults.debugProcess || false) {
				console.log('Error Received', data);
			}
			self.emit(self.eventList.PROCESS_ERROR, data);
		});
		self.mp_event_emitter.on('exit', function(data) {
			if(passedResults.debugProcess || false) {
				console.log('exit Received', data);
			}
			self.emit(self.eventList.PROCESS_EXIT, data);
		});
		self.mp_event_emitter.on('close', function(data) {
			if(passedResults.debugProcess || false) {
				console.log('close Received', data);
			}
			self.emit(self.eventList.PROCESS_CLOSE, data);
		});
		self.mp_event_emitter.on('disconnect', function(data) {
			if(passedResults.debugProcess || false) {
				console.log('disconnect Received', data);
			}
			self.emit(self.eventList.PROCESS_DISCONNECT, data);
		});

		// Clear the one-way-listeners object that is used for routing
		// one-way messages via send or sendMessage to the controllers.
		self.oneWayMessageListeners = {};

		// Create Controllers
		createDriverController();
		createDeviceController();
		// createLoggerController();
		// createFileIOController();

		var options = {
			'execPath': info.path,
			'cwd': info.cwd,
			'spawnChildProcess': false,
			'debug_mode': false
		};

		// Detect if the current process is node-webkit or node via checking for
		// a declared version of node-webkit.
		if(process.versions['node-webkit']) {
			options.silent = true;
			if(passedResults.stdinListener) {
				options.stdinListener = passedResults.stdinListener;
			} else {
				options.stdinListener = function(data) {
					console.log(data.toString());
				};
			}
			if(passedResults.stderrListener) {
				options.stderrListener = passedResults.stderrListener;
			} else {
				options.stderrListener = function(data) {
					console.error(data.toString());
				};
			}
		} else {
			if(passedResults.silent) {
				options.silent = passedResults.silent;
			}
			if(passedResults.stdinListener) {
				options.stdinListener = passedResults.stdinListener;
			}
			if(passedResults.stderrListener) {
				options.stderrListener = passedResults.stderrListener;
			}
		}
		
		// Build a direct-path reference for the io_delegator.js file.  Relative
		// path's don't work very well when starting from node-webkit and the
		// ljswitchboard project.
		var filetoStart = path.join(info.cwd, ioDelegatorPathFromRoot);

		// Start the subprocess.
		self.mp.qStart(filetoStart, options)
		.then(initInternalMessenger, function(err) {
			console.error('Failed to start subprocess', err);
			var code = err.error;
			var msg = io_error_constants.parseError(code);
			err.errorMessage = msg;
			defered.reject(err);
		})
		.then(getDriverConstants)
		.then(function(res) {
			// Initialize Controllers
			self.driver_controller.init()
			.then(self.device_controller.init)
			// .then(self.logger_controller.init)
			// .then(self.file_io_controller.init)
			.then(defered.resolve);
			
			// defered.resolve();
		}, function(err) {
			console.log("Error :(", err);
			defered.reject();
		}, function(err) {
			console.log("BIG ERROR!", err);
			defered.reject();
		});

		return defered.promise;
	};
	this.initialize = function(options) {
		var defered = q.defer();

		var results = {};

		// Check to see if the cwd is being over-ridden.  If so, save it into
		// the results object for the initialization functions to use.
		if(options) {
			// If the options argument was supplied copy over any relevant
			// options to the results object.
			if(options.cwdOverride) {
				results.cwdOverride = cwdOverride;
			}
			if(options.silent) {
				results.silent = options.silent;
			}
			if(options.stdinListener) {
				results.stdinListener = options.stdinListener;
			}
			if(options.stderrListener) {
				results.stderrListener = options.stderrListener;
			}

			// If a user defined the debug flag print out information about the
			// currently running process.
			if(options.debugProcess) {
				console.log('Initializing sub-process');
				console.log('Node Version', process.versions.node);
				console.log('Exec Path', process.execPath);
				console.log('');
			}
		}

		var errFunc = function(err) {
			// console.log('io_interface error', err);
			defered.reject(err);
		};
		
		// For reference, qExec is in charge of passing the results object to
		// each of the functions that get called and any required results to
		// functions after the initial function.

		// Check to make sure labjackm is properly installed
		qExec(checkLabJackM,'checkLabJackM')(results)

		// Check to make sure that the io_manager has been built for this os/node arch. etc.
		.then(qExec(checkRequirements,'checkRequirements', 'cwdOverride'), errFunc)

		// Get various parameters required to start the subprocess
		.then(qExec(innerGetNodePath,'innerGetNodePath', 'checkRequirements'), errFunc)

		// Initialize the subprocess
		.then(qExec(innerInitialize,'innerInitialize', 'innerGetNodePath'), errFunc)

		// Resolve the initialize function
		.then(defered.resolve, errFunc);
		return defered.promise;
	};

	this.establishLink = function(name, listener) {
		var endpoint = name;
		var createMessage = function(m) {
			var defered = q.defer();
			var message = {
				'endpoint': endpoint,
				'data': m
			};
			defered.resolve(message);
			return defered.promise;
		};
		var executeSendReceive = function(m) {
			return self.mp.sendReceive(m);
		};
		var executeSendMessage = function(m) {
			return self.mp.sendMessage(m);
		};
		var cleanMessage = function(m) {
			var defered = q.defer();
			defered.resolve(m);
			return defered.promise;
		};
		var cleanError = function(err) {
			var defered = q.defer();
			defered.reject(err);
			return defered.promise;
		};
		var sendReceive = function(m) {
			var defered = q.defer();

			// Execute sendReceive message
			createMessage(m)
			.then(executeSendReceive)
			.then(cleanMessage, cleanError)
			.then(defered.resolve, defered.reject);

			return defered.promise;
		};
		var sendMessage = function(m) {
			var defered = q.defer();
			createMessage(m)
			.then(executeSendMessage)
			.then(defered.resolve, defered.reject);
			return defered.promise;
		};
		var send = function(m) {
			return self.mp.send(endpoint, m);
		};
		var callFunc = function(name, argList, options) {
			var funcName = '';
			var funcArgs = [];
			if(name) {
				funcName = name;
			}
			if(argList) {
				funcArgs = argList;
			}
			return sendReceive({
				'func': funcName,
				'args': funcArgs,
				'options': options
			});
		};

		self.mp_event_emitter.on(name, listener);
		self.oneWayMessageListeners[name] = listener;
		var defered = q.defer();

		var link = {
			'callFunc': callFunc,
			'sendReceive': sendReceive,
			'sendMessage': sendMessage,
			'send': send
		};
		defered.resolve(link);
		return defered.promise;
	};

	this.destroy = function() {
		var defered = q.defer();

		self.mp.qStop()
		.then(defered.resolve);

		return defered.promise;
	};

	this.getDriverController = function() {
		return self.driver_controller;
	};
	this.getDeviceController = function() {
		return self.device_controller;
	};
	this.getLoggerController = function() {
		return self.logger_controller;
	};
	this.getFileIOController = function() {
		return self.file_io_controller;
	};



	var self = this;
}
util.inherits(createIOInterface, EventEmitter);

var IO_INTERFACE;
exports.createIOInterface = function() {
	if(IO_INTERFACE) {
		return IO_INTERFACE;
	} else {
		IO_INTERFACE = new createIOInterface();
		return IO_INTERFACE;
	}
};
