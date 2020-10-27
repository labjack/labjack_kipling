'use strict';

/**
 * The slave_process is in charge of receiving and responding properly
 * to sendReceive messages from the master_process.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

const {EventEmitter} = require('events');

// include various constants from the constants file
const pm_constants = require('./process_manager_constants');
const PM_STOP_CHILD_PROCESS = pm_constants.stopChildProcess;
const PM_CHILD_PROCESS_STARTED = pm_constants.childProcessStarted;
const PM_GET_PROCESS_INFO = pm_constants.getProcessInfo;
const PM_EMIT_MESSAGE = pm_constants.emitMessage;

// valid user listener types
const SP_Q_LISTENER_TYPE = 'q';
const SP_CALLBACK_LISTENER_TYPE = 'callback';

const IS_DEBUG = false;
const print2 = (argA, argB) => {
	if(IS_DEBUG) {
	    const msg = 'SP:';
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

let exitListenerFunc = null;

let slave_process_env;
if(process.env.slave_process_env) {
	slave_process_env = JSON.parse(process.env.slave_process_env);
	print2('Passed Arguments via json', slave_process_env);
}

class NewMessageManager extends EventEmitter {

	constructor(listeners) {
		super(listeners);

		this.numMessagesReceived = 0;
		this.numInternalMessagesReceived = 0;
		this.numUserMessagesReceived = 0;
		this.numResponces = 0;

		this.savedListener = listeners;
		this.internalMessages = [
			PM_STOP_CHILD_PROCESS,
			PM_GET_PROCESS_INFO
		];

		this.internalMessageBindings = {};
		this.internalMessageBindings[PM_STOP_CHILD_PROCESS] = bundle => this.stopChildProcess(bundle);
		this.internalMessageBindings[PM_GET_PROCESS_INFO] = bundle => this.getProcessInfo(bundle);
	}

	async getProcessInfo(bundle) {
		bundle.successData = {
			'slave_process': {
				'numMessagesReceived': this.numMessagesReceived,
				'numInternalMessagesReceived': this.numInternalMessagesReceived,
				'numUserMessagesReceived': this.numUserMessagesReceived,
				'numResponces': this.numResponces
			},
			'cwd': process.cwd(),
			'execPath': process.execPath,
			'execArgv': process.execArgv,
			'argv': process.argv,
			'pid': process.pid,
			'version': process.version,
			// 'versions': process.versions,
			'arch': process.arch,
			'platform': process.platform,
			// 'config': process.config,
			'memoryUsage': process.memoryUsage(),
			'uptime': process.uptime()
		};
		bundle.isHandled = true;
		return bundle;
	}

	async stopChildProcess(bundle) {
		let retData;
		if(exitListenerFunc) {
			const exitHandler = exitListenerFunc();
			if (typeof(exitHandler) !== 'undefined') {
				if(typeof(exitHandler.then) === 'function') {
					await exitHandler;
					retData = 1;
					bundle.successData = retData;
					bundle.isHandled = true;
					return bundle;
				}
			}
			retData = 1;
			bundle.successData = retData;
			bundle.isHandled = true;
			return bundle;
		} else {
			retData = 1;
			bundle.successData = retData;
			bundle.isHandled = true;
			return bundle;
		}
	}

	isInternalMessage(messageType) {
		return this.internalMessages.indexOf(messageType) >= 0;
	}

	async markMessageHandler(bundle) {
		const messageType = bundle.message.type;
		if (this.isInternalMessage(messageType)) {
			this.numInternalMessagesReceived += 1;
			bundle.isInternalMessage = true;
		} else {
			this.numUserMessagesReceived += 1;
			bundle.executeUserListener = true;
		}
		return bundle;
	}

	async handleInternalMessage(bundle) {
		if (bundle.isInternalMessage) {
			// handle internal message
			if (this.internalMessageBindings[bundle.message.type]) {
				return this.internalMessageBindings[bundle.message.type](bundle);
			} else {
				console.log("Internal Message Type Encountered", bundle.message);
				print2('internal message type encountered', bundle.message);
				bundle.successData = 'internal message handled';
				bundle.isHandled = true;
				return bundle;
			}
		} else {
			return bundle;
		}
	}

	executeListener(bundle) {
		return new Promise((resolve) => {
			if ((!bundle.isHandled) && (bundle.executeUserListener)) {
				print2('in executeListener', bundle.message);
				const onSuccess = (res) => {
						if(bundle.responseRequired) {
						print2(
							'userData in executeListener-q',
							res
						);
						bundle.successData = res;
						bundle.isHandled = true;
						resolve(bundle);
					}
				};
				const onError = (err) => {
					if(bundle.responseRequired) {
						print2(
							'userError noticed in executeListener-q',
							err
						);
						bundle.returnError = true;
						bundle.isHandled = true;
						bundle.errorType = 'userError';
						bundle.errorData = err;
						resolve(bundle);
					}
				};
				const onSyntaxErr = (syntaxError) => {
					if(bundle.responseRequired) {
						print2(
							'syntaxError encountered in executeListener-q',
							syntaxError
						);
						bundle.returnError = true;
						bundle.isHandled = true;
						bundle.errorType = 'syntaxError';
						bundle.errorData = syntaxError;
						resolve(bundle);
					}
				};
				if(bundle.responseRequired) {
					if (this.savedListener.type === SP_Q_LISTENER_TYPE) {
						this.savedListener.func(bundle.message.data)
							.then(res => onSuccess(res), err => onError(err), err => onSyntaxErr(err));
					} else if (this.savedListener.type === SP_CALLBACK_LISTENER_TYPE) {
						try {
							this.savedListener.func(
								bundle.message.data,
								err => onError(err),
								res => onSuccess(res)
							);
						} catch(syntaxError) {
							onSyntaxErr(syntaxError);
						}
					} else {
						throw new Error('savedListener.type not valid, slave_process, OUCH! ' +this.savedListener.type);
					}
				} else {
					this.emit(bundle.message.type, bundle.message.data);
					resolve(bundle);
				}
			} else {
				resolve(bundle);
			}
		});
	}

	respond(bundle) {
		// build a newMessage object that wraps the message with a message id
		// that will later resolve or reject on the promise object.
		const newMessage = {};
		newMessage.id = bundle.id;
		newMessage.type = bundle.message.type;
		newMessage.isError = bundle.returnError;
		if(bundle.returnError) {
			newMessage.errorType = bundle.errorType;
			newMessage.data = bundle.errorData;
		} else {
			newMessage.data = bundle.successData;
		}

		// increment response counter
		this.numResponces += 1;

		// Print Debug message
		print2('Responding to message', newMessage);

		// send the newMessage object to the child process
		process.send(newMessage);

		return Promise.resolve(bundle);
    }

	respondToMessage(bundle) {
		if (bundle.isHandled) {
			return this.respond(bundle);
		} else {
			return Promise.resolve(bundle);
		}
	}

	cleanupMessage(bundle) {
		const keys = Object.keys(bundle);
		keys.forEach((key) => {
			bundle[key] = undefined;
			delete bundle[key];
		});
		bundle = undefined;
		return Promise.resolve();
	}

	async messageListener(m) {
		this.numMessagesReceived += 1;

		const messageBundle = {
			'id': m.id,
			'message': m,
			'isHandled': false,
			'isInternalMessage': false,
			'executeUserListener': false,
			'responseRequired': m.responseRequired,
			'returnError': false,
			'successData': null,
			'errorType': '',
			'errorData': null
		};


		let bundle;
		try {
			// console.log('ddddddddddddddddddddddddddddddddddddddddddd');
			bundle = await this.markMessageHandler(messageBundle);
			// console.log('d1', bundle);
			bundle = await this.handleInternalMessage(bundle);
			// console.log('d2', bundle);
			bundle = await this.executeListener(bundle);
			// console.log('d3', bundle);
			bundle = await this.respondToMessage(bundle);
			// console.log('d4', bundle);
		} finally {
			await this.cleanupMessage(bundle);
		}
	}

	setupProcessStartedMessage(retData) {
		return Promise.resolve({
			'id': PM_CHILD_PROCESS_STARTED,
			'message': {'type': PM_CHILD_PROCESS_STARTED},
			'returnError': false,
			'successData': retData
		});
	}

	finishSetup(retData) {
		return this.setupProcessStartedMessage(retData)
			.then(bundle => this.respond(bundle))
			.then(bundle => this.cleanupMessage(bundle));
	}

	setupEmitMessage(m) {
		return Promise.resolve({
			'id': PM_EMIT_MESSAGE,
			'message': {'type': m.eventType},
			'returnError': false,
			'successData': m
		});
	}

	emitMessage(m) {
		return this.setupEmitMessage(m)
			.then(bundle => this.respond(bundle))
			.then(bundle => this.cleanupMessage(bundle));
	}
}

let messageManager;

// Start defining external interfaces
exports.init = (listener) => {
	// Make sure the listeners object is valid
	if(typeof(listener) === 'undefined') {
		throw new Error('listeners argument is not defined');
	}
	if(typeof(listener.type) === 'undefined') {
		throw new Error('listeners.type is not defined');
	}
	if((listener.type !== SP_Q_LISTENER_TYPE) && (listener.type !== SP_CALLBACK_LISTENER_TYPE)) {
		throw new Error('listeners.type is not valid: ' + listener.type);
	}
	if(typeof(listener.func) === 'undefined') {
		throw new Error('listeners.func is not defined');
	}

    // Create a new messageManager object
	messageManager = new NewMessageManager(listener);

	// Link the messageManager to the processes message event
	process.on('message', (event) => messageManager.messageListener(event));

    // Attach some event listeners to the processManager
    // messageManager.on(PM_CRITICAL_ERROR, criticalErrorListener);
    // messageManager.on(PM_MESSAGE_BUFFER_FULL, criticalErrorListener);

    return messageManager;
};
exports.finishedInit = (retData) => {
	// Indicate that this process is ready to receive messages
	return messageManager.finishSetup(retData);
};

exports.getSlaveProcessInfo = () => {
	return slave_process_env;
};

exports.getStats = () => {
	return {};
};
exports.sendMessage = (data) => {
	if((typeof(data) !== 'undefined')) {
		const message = {
			'eventType': PM_EMIT_MESSAGE,
			'data': data
		};
		return messageManager.emitMessage(message);
	}
};
exports.send = (type, data) => {
	if((typeof(type) !== 'undefined') && (typeof(data) !== 'undefined')) {
		const message = {
			'eventType': type,
			'data': data
		};
		return messageManager.emitMessage(message);
	}
};
exports.attachOnExitListener = (onExitFunc) => {
	exitListenerFunc = onExitFunc;
};
