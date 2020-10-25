const constants = require('./common/constants');
const io_endpoint_key = constants.io_manager_endpoint_key;
const process_manager = require('process_manager');
const fs = require('fs');
const path = require('path');
const slave_process = process_manager.slave_process();

// Include the io_managers
const driver_manager = require('./managers/driver_manager');
const device_manager = require('./managers/device_manager');
const logger_manager = require('./managers/logger_manager');
const file_io_manager = require('./managers/file_io_manager');

const DEBUG = true;
const print2 = function(argA, argB) {
    if(DEBUG) {
        const msg = '* io_d:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};

function runGarbageCollector() {
	if(global.gc) {
		if(typeof(global.gc) === 'function') {
			global.gc();
		}
	}
}
const outputCrashLogBuffer = [];
const clearProcessTimers = function() {
	if(io_delegator_gc) {
		clearInterval(io_delegator_gc);
	}
	if(procesQuitChecker) {
		clearInterval(procesQuitChecker);
	}
};
const io_delegator_sp_env = JSON.parse(process.env.slave_process_env);
function detectIfProcessShouldQuit() {
	const mp_pid = io_delegator_sp_env.masterPID;
	let mp_running = false;
	let killError = '';
	try {
		mp_running = process.kill(mp_pid, 0);
	} catch(err) {
		// Catch the error but do nothing...
		killError = JSON.stringify(err);
	}
	if(!mp_running) {
		clearProcessTimers();
		try {
			outputCrashLogBuffer.push(JSON.stringify({
				'processSendType':typeof(process.send),
				'cwd': process.cwd(),
				'pid': process.pid,
				'slave_process_env_type': typeof(io_delegator_sp_env),
				'slave_process_env': io_delegator_sp_env,
				'masterPID': process.env.slave_process_env['masterPID\\'],
				'mp_pid': mp_pid,
				'mp_pid_type':typeof(mp_pid),
				'mp_running': mp_running,
				'killError':killError,
			}));
			const outputDir = path.join(process.cwd(),'outFile.txt');
			let tempStr = '';
			outputCrashLogBuffer.forEach(function(singleTempStr) {
				tempStr += singleTempStr + '\r\n';
			});
			fs.writeFileSync(outputDir, tempStr);
		} catch(err) {
			// catch error but do nothing.
		}
		process.exit();
		// process.abort();
	}
	// console.log('Typeof process.send', typeof(process.send));
	// console.log('cwd', process.cwd());
}
detectIfProcessShouldQuit();
const io_delegator_gc = setInterval(runGarbageCollector, 5000);
const procesQuitChecker = setInterval(detectIfProcessShouldQuit, 5000);
slave_process.attachOnExitListener(clearProcessTimers);

function createIODelegator(slave_process) {
	this.sp = slave_process;
	this.sp_event_emitter = null;

	// Define manager objects to be created during the init process
	this.driver_manager = null;
	this.device_manager = null;
	this.logger_manager = null;
	this.file_io_manager = null;

	// Define the endpoints object to be used for routing messages by the
	// messageDelegator
	this.endpoints = {};
	this.oneWayEndpoints = {};

	// Define function objects for sending internal messages
	let sendMessage = null;
	let send = null;

	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	const checkEndpoint = function(m) {
		return new Promise((resolve, reject) => {
			if (self.endpoints[m.endpoint]) {
				m.isValidEndpoint = true;
				resolve(m);
			} else {
				print2('sendReceive message sent to invalid endpoint', m.endpoint);
				print2('valid endpoints', self.endpoints);
				reject(m);
			}
		});
	};
	/**
	 * A helper function for the messageDelegator that calls the endpoint's
	 * function.
	 */
	const delegateMessage = function(m) {
		return self.endpoints[m.endpoint](m.message);
	};

	/**
	 * The messageDelegator function handles all incomming messages sent by the
	 * master_process.sendReceive function.  These messages are checked for
	 * valid endpoints and then delegated to the appropriate messageManager.
	 * @type {[type]}
	 */
	this.messageDelegator = function(m) {
		return new Promise((resolve, reject) => {
			const errFunc = function (err) {
				reject(err);
			};
			// print('messageDelegator', m);
			const message = {
				'isValidEndpoint': false,
				'message': m.data,
				'endpoint': m.endpoint
			};
			checkEndpoint(message)
				.then(delegateMessage, errFunc)
				.then(resolve, errFunc);
		});
	};

	// Define functions to initialize the manager objects
	const createDriverManager = function() {
		const key = constants.driver_endpoint_key;
		self.driver_manager = new driver_manager.createNewDriverManager(self);
	};
	const createDeviceManager = function() {
		const key = constants.device_endpoint_key;
		self.device_manager = new device_manager.createNewDeviceManager(self);
	};
	const createLoggerManager = function() {
		const key = constants.logger_endpoint_key;
		self.logger_manager = new logger_manager.createNewLoggerManager(self);
	};
	const createFileIOManager = function() {
		const key = constants.file_io_endpoint_key;
		self.file_io_manager = new file_io_manager.createNewFileIOManager(self);
	};

	/**
	 * The establishLink function gets called by a manager in order to connect
	 * itself/a sub-function with the io_delegator.  It links the messageReceiver and listener
	 * functions and creates/shares functions to make communicating with their
	 * counterparts in the master_process easier.
	 */
	this.establishLink = function(name, messageReceiver, listener) {
		self.endpoints[name] = messageReceiver;
		self.oneWayEndpoints[name] = listener;
		const endpoint = name;
		const createMessage = function(m) {
			const message = {
				'endpoint': endpoint,
				'data': m
			};
			return Promise.resolve(message);
		};
		const executeSendMessage = function(m) {
			return self.sp.sendMessage(m);
		};
		const sendMessage = function(m) {
			return createMessage(m)
			.then(executeSendMessage);
		};
		const send = function(m) {
			return self.sp.send(endpoint, m);
		};

		self.sp_event_emitter.on(name, listener);
		const link = {
			'sendMessage': sendMessage,
			'send': send
		};
		return Promise.resolve(link);
	};

	/**
	 * The destroyLink function gets called by a manager in order to remove
	 * itself/a sub-function from the io_delegator.
	 * @type {[type]}
	 */
	this.destroyLink = function(name) {
		self.endpoints[name] = null;
		self.endpoints[name] = undefined;
		self.oneWayEndpoints[name] = null;
		self.oneWayEndpoints[name] = undefined;
		delete self.endpoints[name];
		delete self.oneWayEndpoints[name];
		self.sp_event_emitter.removeAllListeners(name);
	};

	/**
	 * the function "delegateOneWayMessage" directs incomming one-way messages
	 * toward registered & valid endpoints.
	 */
	const delegateOneWayMessage = function(m) {
		self.oneWayEndpoints[m.endpoint](m.message);
		return Promise.resolve();
	};
	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	const checkOneWayEndpoint = function(m) {
		return new Promise((resolve, reject) => {
			if (self.oneWayEndpoints[m.endpoint]) {
				m.isValidEndpoint = true;
				resolve(m);
			} else {
				print2('sendReceive message sent to invalid endpoint', m.endpoint);
				print2('valid endpoints', self.oneWayEndpoints);
				reject(m);
			}
		});
	};
	/**
	 * The listener function handles one-way slave messages transfered by the
	 * master_process.sendMessage function.
	 */
	this.listener = function(m) {
		return new Promise((resolve, reject) => {
			const errFunc = function (err) {
				print2('listener errFunc', err);
				reject(err);
			};
			const message = {
				'isValidEndpoint': false,
				'message': m.data,
				'endpoint': m.endpoint
			};

			checkOneWayEndpoint(message)
				.then(delegateOneWayMessage, errFunc)
				.then(resolve, errFunc);
		});
	};

	/**
	 * The init function asynchronously initializes the io_delegator object and
	 * any necessary message managers.
	 */
	this.init = function() {
		return new Promise((resolve, reject) => {

			// Clear the registered endpoints
			self.endpoints = {};
			self.oneWayEndpoints = {};

			// Register the messageDelegator as a 'q' function with the slave
			// process and save the returned event_emitter object
			self.sp_event_emitter = self.sp.init({
				'type': 'q',
				'func': self.messageDelegator
			});

			// Register a listener to the 'message' event emitter
			self.sp_event_emitter.on('message', self.listener);

			// Create Managers
			createDriverManager();
			createDeviceManager();
			// createLoggerManager();
			// createFileIOManager();

			initInternals()
				.then(initManager(self.driver_manager, 'dm'))
				.then(initManager(self.device_manager, 'de'))
				.then(resolve);
		});
	};
	const pError = function(name) {
		return function(err) {
			console.log('io_delegator init error', name);
			resolve();
		};
	};
	const initManager = function(manager, name) {
		return function() {
			return new Promise((resolve, reject) => {
				try {
					manager.init()
						.then(
							resolve,
							pError(name + '-1'),
							pError(name + '-2')
						);
				} catch (err) {
					pError(name + '-3')(err);
				}
			});
		};
	};

	this.getRegisteredEndpoints = function(args) {
		return Promise.resolve(Object.keys(self.endpoints));
	};

	const exposedFunctions = {
		'getRegisteredEndpoints': this.getRegisteredEndpoints
	};

	const internalListener = function(m) {
		console.log('* io_delegator internalListener:', m);
		send("Poke Response from io_delegator!");
	};
	const internalMessageReceiver = function(m) {
		return new Promise((resolve, reject) => {
			if (exposedFunctions[m.func]) {
				exposedFunctions[m.func](m.args)
					.then(resolve, reject);
			} else {
				reject('Invalid Function Called: ' + m.func);
			}
		});
	};
	const saveLink = function(link) {
		return new Promise((resolve, reject) => {
			return new Promise((resolve, reject) => {
				sendMessage = link.sendMessage;
				send = link.send;
			});
		});
	};
	const initInternals = function() {
		return new Promise((resolve, reject) => {
			self.establishLink(io_endpoint_key, internalMessageReceiver, internalListener)
				.then(saveLink)
				.then(resolve);
		});
	};

	const self = this;
}

// Create a new io_delegator object
const io_delegator = new createIODelegator(slave_process);

// Initialize the io_delegator
io_delegator.init()
	.then(function(res) {
		return slave_process.finishedInit(slave_process.getSlaveProcessInfo());
	})
	.then(function() {
	// print('Ready to do things....');
	});
