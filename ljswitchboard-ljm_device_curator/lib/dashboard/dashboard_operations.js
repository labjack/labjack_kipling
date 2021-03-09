'use strict';

const EventEmitter = require('events').EventEmitter;
const DashboardDataCollector = require('./dashboard_data_collector');
const device_events = require('../device_events');
const dashboard_channel_parser = require('./dashboard_channel_parser');

/*
 * Two functions to generate an object-diff used to only report 
 * values that have changed.

 * General idea came from lodash/here:
 * http://jsfiddle.net/drzaus/9g5qoxwj/
 */

function isObject(value) {
	const type = typeof(value);
	return value != null & (type === 'object' || type === 'function');
}

function objDiff(newObj, oldObj) {
	const diffObj = {};

	const newKeys = Object.keys(newObj);
	newKeys.forEach(function(newKey) {
		const newObjProp = newObj[newKey];
		if (typeof(oldObj[newKey])) {
			const oldObjProp = oldObj[newKey];

			if (isObject(oldObjProp)) {
				diffObj[newKey] = {};
				// If we are comparing two objects... recurse & extend.
				const subDiffObj = objDiff(newObjProp, oldObjProp);
				const subDiffKeys = Object.keys(subDiffObj);
				subDiffKeys.forEach(function(key) {
					diffObj[newKey][key] = subDiffObj[key];
				});
			} else {
				// If we are comparing two ~values
				if (newObjProp !== oldObjProp) {
					diffObj[newKey] = newObjProp;
				}
			}
		} else {
			// The old object doesn't have this key.
			diffObj[newKey] = newObjProp;
		}
	});
	return diffObj;
}

const DEBUG_DASHBOARD_TEST_FUNC = false;
const DEBUG_DASHBOARD_START = false;

function getLogger(bool) {
	return function logger() {
		if (bool) {
			console.log.apply(console, arguments);
		}
	};
}

const debugDTF = getLogger(DEBUG_DASHBOARD_TEST_FUNC);
const debugDStart = getLogger(DEBUG_DASHBOARD_START);

/*
 * Most of the documentation on this feature of the T7
 * is available on the webpage:
 * https://labjack.com/support/datasheets/t7/sd-card
*/
/*
 * This object is an event-emitter.  It emits events that should also
 * be emitted by the curated device object.
 */
class GetDashboardOperations extends EventEmitter {

	constructor(self) {
		super();

		this.curatedDevice = self;

		// Object that stores the registered listeners.  When there are
		// no listeners, the dashboard data collection should be stopped.
		this.dashboardListeners = {};

		// Object that caches the data.
		this.dataCache = {};

		// variable that stores the dataCollector
		this.dataCollector = null;
	}

	// Function that adds a data listener.
	addListener(uid) {
		if (typeof(this.dashboardListeners[uid]) === 'undefined') {
			this.dashboardListeners[uid] = {
				'startTime': new Date(),
				'numIterations': 0,
				'uid': uid,
				'numStarts': 1,
			};
			return true;
		} else {
			// Don't add the listener.
			this.dashboardListeners[uid].numStarts += 1;
			return false;
		}
	}

	// Function that removes a data listener.  
	removeListener(uid) {
		if (typeof(this.dashboardListeners[uid]) !== 'undefined') {
			this.dashboardListeners[uid] = undefined;
			delete this.dashboardListeners[uid];
			return true;
		}
		return false;
	}

	// Function that gets the number of listeners.
	getNumListeners() {
		return Object.keys(this.dashboardListeners).length;
	}

	// This is a test function that just prooves "basic signs of life".
	async testFunc() {
		debugDTF("In Dashboard testFunc",
			this.curatedDevice.savedAttributes.productType,
			this.curatedDevice.savedAttributes.serialNumber,
			this.curatedDevice.savedAttributes.serialNumber
		);
		return {
			'pt': this.curatedDevice.savedAttributes.productType,
			'sn': this.curatedDevice.savedAttributes.serialNumber,
		};
	}

	// Function that handles the data collection "data" events. This
	// data is the data returned by the read-commands that are performed.
	// This data still needs to be interpreted saved, cached, and organized
	// into "channels".
	// Maybe?? The DashboardDataCollector has logic for each of the devices.
	// This logic should probably be put there?
	dataCollectorHandler(data) {
		const diffObj = objDiff(data, this.dataCache);

		// Clean the object to get rid of empty results.
		const selectedResults = {};
		Object.keys(diffObj).forEach(function(key) {
			if (Object.keys(diffObj[key]).length > 0) {
				selectedResults[key] = diffObj[key];
			}
		});

		// const numKeys = Object.keys(data);
		// const numNewKeys = Object.keys(selectedResults);
		// console.log('Num Keys for new data', numKeys, numNewKeys);
		// console.log('Data Difference - pickBy', selectedResults);
		this.dataCache = data;

		this.emit(device_events.DASHBOARD_DATA_UPDATE, selectedResults);
	}

	// This function starts the data collector and registers event listeners.
	innerStart(bundle) {
		return new Promise(resolve => {
			// Device Type is either T4, T5, or T7
			const deviceType = this.curatedDevice.savedAttributes.deviceTypeName;

			// Save the created data collector object
			this.dataCollector = new DashboardDataCollector(deviceType);

			// Listen to only the next 'data' event emitted by the dataCollector.
			this.dataCollector.once('data', (data) => {
				debugDStart('dev_cur-dash_ops: First bit of data!');

				// Listen to future data.
				this.dataCollector.on('data', (data) => this.dataCollectorHandler(data));

				// Save the data to the data cache.
				this.dataCache = data;
				bundle.data = data;

				// Declare the innerStart function to be finished.
				resolve(bundle);
			});

			// Start the data collector.
			this.dataCollector.start(this.curatedDevice);
		});
	}

	/*
	 * This function starts the dashboard-ops procedure and registers a listener.
	 * This function returns data required to initialize the dashboard page.  If
	 * the listener already exists then its uid isn't added (since it is already
	 * there).
	*/
	async dashboard_start(uid) {
		const addedListener = this.addListener(uid);
		const numListeners = this.getNumListeners();
		const bundle = {
			'uid': uid,
			'data': {},
		};

		if (addedListener && (numListeners === 1)) {
			// We need to start the dashboard-service and we need to return 
			// the current state of all of the channels.
			try {
				await this.innerStart(bundle);
			} catch (err) {
				console.error(err);
			}
		} else {
			bundle.data = this.dataCache;
		}
		return bundle;
	}

	/*
	 * This function stops the dashboard-ops procedure and un-registers a listener.
	 * If there are zero remaining listeners than the DAQ loop actually stops running.
	 */
	async dashboard_stop(uid) {
		const removedListener = this.removeListener(uid);
		const numListeners = this.getNumListeners();
		const bundle = {
			'uid': uid,
			'isStopped': false,
		};

		if (removedListener && (numListeners === 0)) {
			// We need to stop the dashboard-service.
			try {
				bundle.isStopped = this.dataCollector.stop();
				return bundle;
			} catch (err) {
				return bundle;
			}
		} else {
			// We don't need to stop the dashboard-service.  It should already
			// be stopped.
			return bundle;
		}
	}

	createConfigIOBundle(channelName, attribute, value) {
		return {
			'channelName': channelName,
			'attribute': attribute,
			'value': value,

			'registersToWrite': [],
			'valuesToWrite': [],

			'isError': false,
			'errMessage': '',
		};
	}

	getChannelInfo(channelName) {
		const deviceTypeName = this.curatedDevice.savedAttributes.deviceTypeName;
		const channels = dashboard_channel_parser.channels[deviceTypeName];

		const chInfo = channels[channelName];

		return {
			'type': chInfo.type,
			'ioNum': chInfo.ioNum,
			'name': chInfo.name,
		};
	}

	async performWrites(bundle) {
		const executeWrite = (bundle.registersToWrite.length >= 0 && bundle.valuesToWrite.length >= 0);

		if (executeWrite) {
			// console.log('Executing iWriteMany', bundle.registersToWrite, bundle.valuesToWrite);
			try {
				await this.curatedDevice.iWriteMany(bundle.registersToWrite, bundle.valuesToWrite);
				return {
					'registers': bundle.registersToWrite,
					'values': bundle.valuesToWrite,
				};
			} catch (err) {
				return {
					'registers': bundle.registersToWrite,
					'values': bundle.valuesToWrite,
					'err': err,
				};
			}
		} else {
			return {
				'registers': bundle.registersToWrite,
				'values': bundle.valuesToWrite,
			};
		}
	}

	async dashboard_configIO(channelName, attribute, value) {
		// console.log('in this.configIO', channelName, attribute, value);

		const bundle = this.createConfigIOBundle(channelName, attribute, value);

		const validAttributes = {
			'analogEnable': {
				'enable': 1,
				'disable': 0,
			},
			'digitalDirection': {
				'output': 1,
				'input': 0,
			},
			'digitalState': {
				'high': 1,
				'low': 0,
			},
		};

		const chInfo = this.getChannelInfo(channelName);
		const chType = chInfo.type;

		let chNum = 0;
		let chNumValid = false;
		try {
			if (typeof(value) === 'string') {
				chNum = validAttributes[attribute][value];
			} else if (typeof(value) === 'number') {
				chNum = value;
			}
			if (typeof(chNum) === 'number') {
				chNumValid = true;
			}
		} catch(err) {
			// catch the error...
		}

		const bitMask = 0x0FFFFFFF;
		if (chNumValid) {
			if (chType === 'AIN') {
				// We don't have to really write anything...
			} else if (chType === 'DIO') {
				if (attribute === 'digitalDirection') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_DIRECTION');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if (attribute === 'digitalState') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_STATE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				}
			} else if (chType === 'FLEX') {
				if (attribute === 'digitalDirection') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_DIRECTION');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if (attribute === 'digitalState') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_STATE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if (attribute === 'analogEnable') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_ANALOG_ENABLE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				}
			} else if (chType === 'AO') {
				if (attribute === 'analogValue') {
					bundle.registersToWrite.push(chInfo.name);
					bundle.valuesToWrite.push(value);
				}
			} else {
				// Don't do anything...
			}
		}

		// console.log('resolving..', chInfo, chType, chNum, chNumValid, bundle.registersToWrite, bundle.valuesToWrite);
		return await this.performWrites(bundle);
	}
}

module.exports.get = GetDashboardOperations;
