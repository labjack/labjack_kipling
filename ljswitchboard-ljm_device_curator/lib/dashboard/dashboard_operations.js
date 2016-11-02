
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var dashboard_data_collector = require('./dashboard_data_collector');
var _ = require('lodash');
var device_events = require('../device_events');
var dashboard_channel_parser = require('./dashboard_channel_parser');

/*
 From here:
 http://jsfiddle.net/drzaus/9g5qoxwj/
 */
function deepDiff(a, b, r, reversible) {
	_.each(a, function(v, k) {
	  // already checked this or equal...
	  if (r.hasOwnProperty(k) || b[k] === v) return;
	  // but what if it returns an empty object? still attach?
	  r[k] = _.isObject(v) ? _.diff(v, b[k], reversible) : v;
	});
}

/* the function */
_.mixin({
	shallowDiff: function(a, b) {
	  return _.omit(a, function(v, k) {
	    return b[k] === v;
	  });
	},
	diff: function(a, b, reversible) {
	  var r = {};
	  deepDiff(a, b, r, reversible);
	  if(reversible) deepDiff(b, a, r, reversible);
	  return r;
	}
});

var DEBUG_DASHBOARD_OPERATIONS = false;
var DEBUG_DASHBOARD_GET_ALL = false;
var DEBUG_DASHBOARD_UPDATE = false;
var DEBUG_DASHBOARD_TEST_FUNC = false;
var DEBUG_DASHBOARD_START = false;
var DEBUG_DASHBOARD_DATA_COLLECTOR = true;
var ENABLE_ERROR_OUTPUT = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugDOps = getLogger(DEBUG_DASHBOARD_OPERATIONS);
var debugDGA = getLogger(DEBUG_DASHBOARD_GET_ALL);
var debugDU = getLogger(DEBUG_DASHBOARD_UPDATE);
var debugDTF = getLogger(DEBUG_DASHBOARD_TEST_FUNC);
var debugDStart = getLogger(DEBUG_DASHBOARD_START);
var debugDDC = getLogger(DEBUG_DASHBOARD_DATA_COLLECTOR);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

/*
 * Most of the documentation on this feature of the T7
 * is available on the webpage:
 * https://labjack.com/support/datasheets/t7/sd-card
*/
/*
 * This object is an event-emitter.  It emits events that should also
 * be emitted by the curated device object.
 */
function getDashboardOperations(self) {
	var curatedDevice = self;

	// Object that stores the registered listeners.  When there are
	// no listeners, the dashboard data collection should be stopped.
	var dashboardListeners = {};

	// Object that caches the data.
	this.dataCache = {};

	// Function that adds a data listener.
	function addListener(uid) {
		var addedListener = false;
		if(typeof(dashboardListeners[uid]) === 'undefined') {
			dashboardListeners[uid] = {
				'startTime': new Date(),
				'numIterations': 0,
				'uid': uid,
				'numStarts': 1,
			};
			addedListener = true;
		} else {
			// Don't add the listener.
			dashboardListeners[uid].numStarts += 1;
		}
		return addedListener;
	}

	// Function that removes a data listener.  
	function removeListener(uid) {
		var removedListener = false;
		if(typeof(dashboardListeners[uid]) !== 'undefined') {
			dashboardListeners[uid] = undefined;
			delete dashboardListeners[uid];
			removedListener = true;
		}
		return removedListener;
	}

	// Function that gets the number of listeners.
	function getNumListeners() {
		return Object.keys(dashboardListeners).length;
	}

	// This is a test function that just prooves "basic signs of life".
	this.testFunc = function() {
		var defered = q.defer();
		debugDTF("In Dashboard testFunc",
			self.savedAttributes.productType,
			self.savedAttributes.serialNumber,
			self.savedAttributes.serialNumber
		);
		var info = {
			'pt': self.savedAttributes.productType,
			'sn': self.savedAttributes.serialNumber,
		};
		defered.resolve(info);
		return defered.promise;
	};

	// variable that stores the dataCollector
	var dataCollector;

	// Function that handles the data collection "data" events.  This
	// data is the data returned by the read-commands that are performed.
	// This data still needs to be interpreted saved, cached, and organized
	// into "channels".
	// Maybe?? The dashboard_data_collector has logic for each of the devices.
	// This logic should probably be put there?
	function dataCollectorHandler(data) {
		// debugDDC('New data', data['FIO0']);
		var diffObj = _.diff(data, self.dataCache);

		// console.log('Data Difference - diff', diffObj);
		// Clean the object to get rid of empty results.
		diffObj = _.pickBy(diffObj, function(value, key) {
			return Object.keys(value).length > 0;
		});

		var numKeys = Object.keys(data);
		var numNewKeys = Object.keys(diffObj);
		// console.log('Num Keys for new data', numKeys, numNewKeys);
		// console.log('Data Difference - pickBy', diffObj);
		self.dataCache = data;

		self.emit(device_events.DASHBOARD_DATA_UPDATE, diffObj);
	}

	// Function that creates the "bundle" that is built-up and passed between
	// the steps that perform the "start" method.
	function createStartBundle(uid) {
		// Create and define the bundle object.
		return {
			'uid': uid,
			'data': {},
		};
	}

	// This function starts the data collector and registers event listeners.
	function innerStart (bundle) {
		var defered = q.defer();

		// Device Type is either T4, T5, or T7
		var deviceType = self.savedAttributes.deviceTypeName;

		// Save the created data collector object
		dataCollector = new dashboard_data_collector.create(deviceType);

		// Listen to only the next 'data' event emitted by the dataCollector.
		dataCollector.once('data', function(data) {
			debugDStart('dev_cur-dash_ops: First bit of data!');

			// Listen to future data.
			dataCollector.on('data', dataCollectorHandler);

			// Save the data to the data cache.
			self.dataCache = data;
			bundle.data = data;

			// Declare the innerStart function to be finished.
			defered.resolve(bundle);
		});

		// Start the data collector.
		dataCollector.start(self);

		return defered.promise;
	}

	/*
	 * This function starts the dashboard-ops procedure and registers a listener.
	 * This function returns data required to initialize the dashboard page.  If
	 * the listener already exists then its uid isn't added (since it is already
	 * there).
	*/
	this.start = function(uid) {
		var defered = q.defer();
		var addedListener = addListener(uid);
		var numListeners = getNumListeners();
		var bundle = createStartBundle(uid);

		function onSuccess(rBundle) {
			defered.resolve(rBundle);
		}
		function onError(rBundle) {
			defered.resolve(rBundle);
		}

		if(addedListener && (numListeners == 1)) {
			// We need to start the dashboard-service and we need to return 
			// the current state of all of the channels.
			innerStart(bundle)
			.then(onSuccess, onError);
		} else {
			// We don't need to start the dashboard-service.  We just need to
			// return the current state of all of the channels.
			onSuccess(bundle);
		}
		return defered.promise;
	};

	/*
	 * These functions "pause" and "resume" the data-reporting
	 */
	this.pauseReporting = function(){};
	this.resumeReporting = function(){};

	/*
	 * These functions "pause" and "resume" the DAQ loop collecting data from
	 * the device.
	 */
	this.pauseCollecting = function(){};
	this.resumeCollecting = function(){};


	function createStopBundle(uid) {
		return {
			'uid': uid,
			'isStopped': false,
		};
	}
	function innerStop(bundle) {
		var defered = q.defer();

		var isStopped = dataCollector.stop();
		bundle.isStopped = isStopped;
		defered.resolve(bundle);

		return defered.promise;
	}

	/* 
	 * This function stops the dashboard-ops procedure and un-registers a listener.
	 * If there are zero remaining listeners than the DAQ loop actually stops running.
	 */
	this.stop = function(uid){
		var defered = q.defer();
		var removedListener = removeListener(uid);
		var numListeners = getNumListeners();
		var bundle = createStopBundle(uid);

		function onSuccess(rBundle) {
			defered.resolve(rBundle);
		}
		function onError(rBundle) {
			defered.resolve(rBundle);
		}

		if(removedListener && (numListeners === 0)) {
			// We need to stop the dashboard-service.
			innerStop(bundle)
			.then(onSuccess, onError);
		} else {
			// We don't need to stop the dashboard-service.  It should already
			// be stopped.
			onSuccess(bundle);
		}
		return defered.promise;
	};

	function createConfigIOBundle(channelName, attribute, value) {
		var bundle = {
			'channelName': channelName,
			'attribute': attribute,
			'value': value,

			'registersToWrite': [],
			'valuesToWrite': [],

			'isError': false,
			'errMessage': '',
		};
		return bundle;
	}

	
	function getChannelInfo(channelName) {
		var deviceTypeName = curatedDevice.savedAttributes.deviceTypeName;
		var channels = dashboard_channel_parser.channels[deviceTypeName];

		var chInfo = channels[channelName];

		var info = {
			'type': chInfo.type,
			'ioNum': chInfo.ioNum,
			'name': chInfo.name,
		};

		return info;
	}
	function performWrites(bundle) {
		var executeWrite = false;
		if(bundle.registersToWrite.length >= 0) {
			if(bundle.valuesToWrite.length >= 0) {
				executeWrite = true;
			}
		}
		var defered = q.defer();
		if(executeWrite) {
			// console.log('Executing iWriteMany', bundle.registersToWrite, bundle.valuesToWrite);
			curatedDevice.iWriteMany(bundle.registersToWrite, bundle.valuesToWrite)
			.then(function(res) {
				defered.resolve({
					'registers': bundle.registersToWrite,
					'values': bundle.valuesToWrite,
				});
			})
			.catch(function(err) {
				defered.resolve({
					'registers': bundle.registersToWrite,
					'values': bundle.valuesToWrite,
					'err': err,
				});
			});
		} else {
			defered.resolve({
				'registers': bundle.registersToWrite,
				'values': bundle.valuesToWrite,
			});
		}
		return defered.promise;
	}

	this.configIO = function(channelName, attribute, value) {
		// console.log('in this.configIO', channelName, attribute, value);
		var defered = q.defer();

		var bundle = createConfigIOBundle(channelName, attribute, value);

		var validAttributes = {
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

		var chInfo = getChannelInfo(channelName);
		var chType = chInfo.type;

		var chNum = 0;
		var chNumValid = false;
		try {
			if(typeof(value) === 'string') {
				chNum = validAttributes[attribute][value];
			} else if(typeof(value) === 'number') {
				chNum = value;
			}
			if(typeof(chNum) === 'number') {
				chNumValid = true;
			}
		} catch(err) {
			// catch the error...
		}

		
		var bitMask = 0x0FFFFFFF;
		if(chNumValid) {
			if(chType === 'AIN') {
				// We don't have to really write anything...
			} else if(chType === 'DIO') {
				if(attribute === 'digitalDirection') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_DIRECTION');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if(attribute === 'digitalState') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_STATE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				}
			} else if(chType === 'FLEX') {
				if(attribute === 'digitalDirection') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_DIRECTION');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if(attribute === 'digitalState') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_STATE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				} else if(attribute === 'analogEnable') {
					bundle.registersToWrite.push('DIO_INHIBIT');
					bundle.valuesToWrite.push(bitMask ^ (1<<chInfo.ioNum));
					bundle.registersToWrite.push('DIO_ANALOG_ENABLE');
					bundle.valuesToWrite.push(chNum<<chInfo.ioNum);
				}
			} else if(chType === 'AO') {
				if(attribute === 'analogValue') {
					bundle.registersToWrite.push(chInfo.name);
					bundle.valuesToWrite.push(value);
				}
			} else {
				// Don't do anything...
			}
		}

		// console.log('resolving..', chInfo, chType, chNum, chNumValid, bundle.registersToWrite, bundle.valuesToWrite);
		performWrites(bundle)
		.then(defered.resolve)
		.catch(defered.resolve);
		return defered.promise;
	};
}

util.inherits(getDashboardOperations, EventEmitter);

module.exports.get = getDashboardOperations;