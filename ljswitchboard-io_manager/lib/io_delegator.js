'use strict';

const constants = require('./common/constants');
const io_endpoint_key = constants.io_manager_endpoint_key;
const process_manager = require('process_manager');
const fs = require('fs');
const path = require('path');
const slave_process = process_manager.slave_process();

// Include the io_managers
const driver_manager = require('./managers/driver_manager');
const device_manager = require('./managers/device_manager');

const DEBUG = true;
const print2 = (argA, argB) => {
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
const clearProcessTimers = () => {
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
				'processSendType': typeof(process.send),
				'cwd': process.cwd(),
				'pid': process.pid,
				'slave_process_env_type': typeof(io_delegator_sp_env),
				'slave_process_env': io_delegator_sp_env,
				'masterPID': process.env.slave_process_env['masterPID\\'],
				'mp_pid': mp_pid,
				'mp_pid_type': typeof(mp_pid),
				'mp_running': mp_running,
				'killError': killError,
			}));
			const outputDir = path.join(process.cwd(),'outFile.txt');
			let tempStr = '';
			outputCrashLogBuffer.forEach((singleTempStr) => {
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

class IODelegator {

	constructor(slave_process) {
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
		this.sendMessage = null;
		this.send = null;

		this.exposedFunctions = {
			'getRegisteredEndpoints': () => this.getRegisteredEndpoints()
		};
	}

	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	checkEndpoint(m) {
		return new Promise((resolve, reject) => {
			if (this.endpoints[m.endpoint]) {
				m.isValidEndpoint = true;
				resolve(m);
			} else {
				print2('sendReceive message sent to invalid endpoint', m.endpoint);
				print2('valid endpoints', this.endpoints);
				reject(m);
			}
		});
	}

	/**
	 * A helper function for the messageDelegator that calls the endpoint's
	 * function.
	 */
	delegateMessage(m) {
		return this.endpoints[m.endpoint](m.message);
	}

	/**
	 * The messageDelegator function handles all incomming messages sent by the
	 * master_process.sendReceive function.  These messages are checked for
	 * valid endpoints and then delegated to the appropriate messageManager.
	 * @type {[type]}
	 */
	messageDelegator(m) {
		const message = {
			'isValidEndpoint': false,
			'message': m.data,
			'endpoint': m.endpoint
		};
		return this.checkEndpoint(message)
			.then(m => this.delegateMessage(m));
	}

	// Define functions to initialize the manager objects
	createDriverManager() {
		this.driver_manager = new driver_manager.createNewDriverManager(this);
	}

	createDeviceManager() {
		this.device_manager = new device_manager.createNewDeviceManager(this);
	}

	/**
	 * The establishLink function gets called by a manager in order to connect
	 * itself/a sub-function with the io_delegator.  It links the messageReceiver and listener
	 * functions and creates/shares functions to make communicating with their
	 * counterparts in the master_process easier.
	 */
	establishLink(endpoint, messageReceiver, listener) {
		this.endpoints[endpoint] = (m) => messageReceiver(m);
		this.oneWayEndpoints[endpoint] = (m) => listener(m);
		const sendMessage = (data) => this.sp.sendMessage(data);
		const send = (data) => this.sp.send(endpoint, data);

		this.sp_event_emitter.on(endpoint, listener);
		const link = { sendMessage, send };
		return Promise.resolve(link);
	}

	/**
	 * The destroyLink function gets called by a manager in order to remove
	 * itself/a sub-function from the io_delegator.
	 * @type {[type]}
	 */
	destroyLink(name) {
		this.endpoints[name] = null;
		this.endpoints[name] = undefined;
		delete this.endpoints[name];
		this.oneWayEndpoints[name] = null;
		this.oneWayEndpoints[name] = undefined;
		delete this.oneWayEndpoints[name];
		this.sp_event_emitter.removeAllListeners(name);
	}

	/**
	 * the function "delegateOneWayMessage" directs incomming one-way messages
	 * toward registered & valid endpoints.
	 */
	delegateOneWayMessage(m) {
		this.oneWayEndpoints[m.endpoint](m.message);
		return Promise.resolve();
	}

	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	checkOneWayEndpoint(m) {
		if (this.oneWayEndpoints[m.endpoint]) {
			m.isValidEndpoint = true;
			return Promise.resolve(m);
		} else {
			print2('sendReceive message sent to invalid endpoint', m.endpoint);
			print2('valid endpoints', this.oneWayEndpoints);
			return Promise.reject(m);
		}
	}

	/**
	 * The listener function handles one-way slave messages transfered by the
	 * master_process.sendMessage function.
	 */
	listener(m) {
		const errFunc = (err) => {
			print2('listener errFunc', err);
			throw err;
		};
		const message = {
			'isValidEndpoint': false,
			'message': m.data,
			'endpoint': m.endpoint
		};

		return this.checkOneWayEndpoint(message)
			.then(m => this.delegateOneWayMessage(m), errFunc);
	}

	/**
	 * The init function asynchronously initializes the io_delegator object and
	 * any necessary message managers.
	 */
	init() {
		// Clear the registered endpoints
		this.endpoints = {};
		this.oneWayEndpoints = {};

		// Register the messageDelegator as a 'q' function with the slave
		// process and save the returned event_emitter object
		this.sp_event_emitter = this.sp.init({
			'type': 'q',
			'func': (res) => this.messageDelegator(res)
		});

		// Register a listener to the 'message' event emitter
		this.sp_event_emitter.on('message', this.listener);

		// Create Managers
		this.createDriverManager();
		this.createDeviceManager();

		return this.initInternals()
			.then(() => this.initManager(this.driver_manager, 'dm'))
			.then(() => this.initManager(this.device_manager, 'de'));
	}

	pError(name) {
		console.log('io_delegator init error', name);
	}

	initManager(manager, name) {
		return new Promise((resolve) => {
			try {
				manager.init()
					.then(
						resolve,
						() => this.pError(name + '-1'),
						() => this.pError(name + '-2')
					);
			} catch (err) {
				this.pError(name + '-3');
			}
		});
	}

	getRegisteredEndpoints() {
		return Promise.resolve(Object.keys(this.endpoints));
	}

	internalListener(m) {
		console.log('* io_delegator internalListener:', m);
		this.send("Poke Response from io_delegator!");
	}

	internalMessageReceiver(m) {
		if (this.exposedFunctions[m.func]) {
			return this.exposedFunctions[m.func](m.args);
		} else {
			return Promise.reject('Invalid Function Called: ' + m.func);
		}
	}

	async saveLink(link) {
		this.sendMessage = link.sendMessage;
		this.send = link.send;
	}

	initInternals() {
		return this.establishLink(io_endpoint_key, m => this.internalMessageReceiver(m), m => this.internalListener(m))
			.then(link => this.saveLink(link));
	}

}

// Create a new io_delegator object
const io_delegator = new IODelegator(slave_process);

// Initialize the io_delegator
io_delegator.init()
	.then(() => {
		return slave_process.finishedInit(slave_process.getSlaveProcessInfo());
	})
	.then(() => {
	// print('Ready to do things....');
	});
