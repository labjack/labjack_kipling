'use strict';

const process_manager = require('process_manager');

// Include the single_device_controller
const single_device_controller = require('./controllers/single_device_controller');
// const constants = require('./common/constants');

class SingleDeviceInterface {

	constructor() {
		this.mp = null;
		this.mp_event_emitter = null;

		// Define a single device controller object reference
		this.single_device_controller = null;
	}


	// Function to initialize the single_device_controller object
	createSingleDeviceController() {
		console.log("Creating createSingleDeviceController");
		this.single_device_controller = new single_device_controller.createSingleDeviceController(this);
	}

	/**
	 * Initialize the single_device-interface will initialize a new
	 * master_process instance (aka this/this.mp) and save it.  Will also save
	 * a reference to the created event_emitter and start a new child process.
	 * Once this is done, a single_device_controller object will be properly
	 * linked with the messaging system thus providing a "device" object.
	**/
	async initialize() {
		try {
			this.mp = new process_manager.master_process();
			this.mp_event_emitter = this.mp.init();

			// create the single_device_controller object:
			this.createSingleDeviceController();

			await this.mp.qStart('./lib/delegators/single_device_delegator.js');
			await this.single_device_controller.init();
		} catch(err) {
			console.log("try-catch error", err);
			throw err;
		}
	}

	establishLink(endpoint, listener) {
		console.log("sdi.js establishLink");
		const sendReceive = (data) => this.mp.sendReceive({ endpoint, data });
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

		const link = {
			'callFunc': callFunc,
			'sendReceive': sendReceive,
			'sendMessage': (data) => this.mp.sendMessage({ endpoint, data }),
			'send': send
		};

		console.log('sdi.js end of establishLink');
		return Promise.resolve(link);
	}

	destroy() {
		return this.mp.qStop();
	}
}

exports.createSingleDeviceInterface = () => {
	return new SingleDeviceInterface();
};
