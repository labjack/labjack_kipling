'use strict';

const EventEmitter = require('events').EventEmitter;
const q = require('q');
const dashboard_channel_parser = require('./dashboard_channel_parser');

const DEBUG_T4_DATA_COLLECTOR = false;
const DEBUG_T4_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.
const DEBUG_T4_READ_DATA = false;

var DEBUG_T5_DATA_COLLECTOR = false;
var DEBUG_T5_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

var DEBUG_T7_DATA_COLLECTOR = false;
var DEBUG_T7_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

var DEBUG_T8_DATA_COLLECTOR = false;
var DEBUG_T8_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

var DEBUG_COLLECTION_MANAGER = false;
var ENABLE_ERROR_OUTPUT = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugT4DC = getLogger(DEBUG_T4_DATA_COLLECTOR);
var debugT4RD = getLogger(DEBUG_T4_READ_DATA);
var debugT4CD = getLogger(DEBUG_T4_COLLECTED_DATA);
var debugT5DC = getLogger(DEBUG_T5_DATA_COLLECTOR);
var debugT5CD = getLogger(DEBUG_T5_COLLECTED_DATA);
var debugT7DC = getLogger(DEBUG_T7_DATA_COLLECTOR);
var debugT7CD = getLogger(DEBUG_T7_COLLECTED_DATA);
var debugT8DC = getLogger(DEBUG_T8_DATA_COLLECTOR);
var debugT8CD = getLogger(DEBUG_T8_COLLECTED_DATA);
var debugCM = getLogger(DEBUG_COLLECTION_MANAGER);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

var T4_NUM_ANALOG_CHANNELS = 12;
var T5_NUM_ANALOG_CHANNELS = 8;
var T7_NUM_ANALOG_CHANNELS = 14;
var T8_NUM_ANALOG_CHANNELS = 8;

var t4Channels = dashboard_channel_parser.channels.T4;
var t5Channels = dashboard_channel_parser.channels.T5;
var t7Channels = dashboard_channel_parser.channels.T7;
var t8Channels = dashboard_channel_parser.channels.T8;

function t4CollectGeneralData(bundle) {
	return new Promise((resolve) => {
		var device = bundle.device;

		var registersToRead = ['DIO_ANALOG_ENABLE', 'DIO_STATE', 'DIO_DIRECTION'];
		var i = 0;
		// Add analog output registers
		for (i = 0; i < 2; i++) {
			registersToRead.push('DAC' + i.toString());
		}

		device.sReadMany(registersToRead)
			.then((results) => {
				debugT4RD('Collected T4 General Data', results);

				// Transfer the collected data to the "data" object.
				results.forEach((result) => {
					bundle.rawData[result.name] = result;
				});

				// String starts out as 'b101010'
				// Remove the 'b' from the binary string.
				var binaryStr = bundle.rawData.DIO_ANALOG_ENABLE.binaryStr.split('b').join('');

				// Flip the string so that it can be traversed for AIN0 -> AINxx order.
				var flippedStr = binaryStr.split('').reverse().join('');

				var channelsToRead = [];
				var ainChannels = {};
				var numADCChannels = T4_NUM_ANALOG_CHANNELS;
				for (var i = 0; i < numADCChannels; i++) {
					var channelEnabled = false;
					if (typeof (flippedStr[i]) !== 'undefined') {
						if (flippedStr[i] === '1') {
							channelEnabled = true;
						} else {
							channelEnabled = false;
						}
					}


					var channelStr = 'AIN' + i.toString();
					ainChannels[channelStr] = {
						'ainEnabled': channelEnabled,
						'channelName': channelStr,
						'val': 0,
					};

					if (channelEnabled) {
						channelsToRead.push(channelStr);
					}
				}
				bundle.ainChannelsToRead = channelsToRead;
				bundle.ainChannelsData = ainChannels;
				resolve(bundle);
			})
			.catch((err) => {
				errorLog('T4 Dash-DataCollector-GenData-Error', err);
				resolve(bundle);
			});
	});
}

function t4CollectAINData(bundle) {
	return new Promise((resolve) => {
		var device = bundle.device;
		var channelsToRead = bundle.ainChannelsToRead;

		debugT4DC('AIN Channels to read', channelsToRead);
		device.sReadMany(channelsToRead)
			.then((results) => {
				debugT4RD('Collected T4 AIN Data', results);

				// Transfer the collected data to the "data" object.
				results.forEach((result) => {
					bundle.rawData[result.name] = result;
					bundle.ainChannelsData[result.name].val = result.val;
				});
				resolve(bundle);
			})
			.catch((err) => {
				resolve(bundle);
			});
	});
}

async function genericOrganizeDIOData(bundle) {
	// Binary Strings start out as 'b101010'
	// Remove the 'b' from the binary string.
	var dioStateBinStr = bundle.rawData.DIO_STATE.binaryStr.split('b').join('');
	var dioDirBinStr = bundle.rawData.DIO_DIRECTION.binaryStr.split('b').join('');

	// Flip the strings so that they can be traversed xx0 -> xx100.
	var dioStateFlipStr = dioStateBinStr.split('').reverse().join('');
	var dioDirFlipStr = dioDirBinStr.split('').reverse().join('');

	var dioChannels = {};
	var numDIOChannels = 23; // FIO0 -> MIO2
	for (var i = 0; i < numDIOChannels; i++) {
		// Logic to populate dioState
		var dioState = 0;
		var dioStateStr = 'Low';
		if (typeof (dioStateFlipStr[i]) !== 'undefined') {
			if (dioStateFlipStr[i] === '1') {
				dioState = 1;
				dioStateStr = 'High';
			} else {
				dioState = 0;
				dioStateStr = 'Low';
			}
		}

		// Logic to populate dioDirection
		var dioDirection = 0;
		var dioDirectionStr = 'Input';
		if (typeof (dioDirFlipStr[i]) !== 'undefined') {
			if (dioDirFlipStr[i] === '1') {
				dioDirection = 1;
				dioDirectionStr = 'Output';
			} else {
				dioDirection = 0;
				dioDirectionStr = 'Input';
			}
		}

		var strPrefix = 'DIO';
		var strChNumOffset = 0;
		if (0 <= i && i <= 7) {
			strChNumOffset = 0;
			strPrefix = 'FIO';
		} else if (8 <= i && i <= 15) {
			strChNumOffset = 8;
			strPrefix = 'EIO';
		} else if (16 <= i && i <= 19) {
			strChNumOffset = 16;
			strPrefix = 'CIO';
		} else if (20 <= i && i <= 22) {
			strChNumOffset = 20;
			strPrefix = 'MIO';
		}
		var channelStr = 'DIO' + i.toString();
		var channelNameStr = strPrefix + (i - strChNumOffset).toString();
		dioChannels[channelStr] = {
			// 'state': {'val': dioState, 'str': dioStateStr},
			'state': dioState,
			'stateStr': dioStateStr,
			'direction': dioDirection,
			'directionStr': dioDirectionStr,
			// 'direction': {'val': dioDirection, 'str': dioDirectionStr},
			'channelName': channelNameStr,
			'channelStr': channelStr,
		};
	}
	bundle.dioChannelsData = dioChannels;

	return bundle;
}



function getDataOrganizer(deviceChannels) {
	return async (bundle) => {
		// console.log('ainChannelsData', bundle.ainChannelsData);
		// console.log('dioChannelsData', bundle.dioChannelsData);

		var allAINData = bundle.ainChannelsData;
		var allDIOData = bundle.dioChannelsData;
		// var ainKeys = Object.keys(allAINData);
		// var dioKeys = Object.keys(allDIOData);

		// Loop through the t4 "channels" to organize the collected data.
		Object.keys(deviceChannels).forEach((key, i) => {
			var channelData = {};
			var deviceChannel = deviceChannels[key];
			var type = deviceChannel.type;
			var ioNum = deviceChannel.ioNum;
			var chName = deviceChannel.name;

			var ainData = {};
			var ainKey = 'AIN' + ioNum;
			var dioData = {};
			var dioKey = 'DIO' + ioNum;

			// Handle the different channel types, AIN, FLEX, DIO, and AO.
			if (type === 'AIN') {
				// Add the collected AIN data if it exists.
				if (typeof (allAINData[ainKey]) !== 'undefined') {
					Object.keys(allAINData[ainKey]).forEach((key) => {
						channelData[key] = allAINData[ainKey][key];
					});
				}
			} else if (type === 'FLEX') {
				// Add the collected AIN data if it exists.
				if (typeof (allAINData[ainKey]) !== 'undefined') {
					Object.keys(allAINData[ainKey]).forEach((key) => {
						channelData[key] = allAINData[ainKey][key];
					});
				}
				// Add the collected DIO data if it exists.
				if (typeof (allDIOData[dioKey]) !== 'undefined') {
					Object.keys(allDIOData[dioKey]).forEach((key) => {
						channelData[key] = allDIOData[dioKey][key];
					});
				}
			} else if (type === 'DIO') {
				// Add the collected DIO data if it exists.
				if (typeof (allDIOData[dioKey]) !== 'undefined') {
					Object.keys(allDIOData[dioKey]).forEach((key) => {
						channelData[key] = allDIOData[dioKey][key];
					});
				}
			} else if (type === 'AO') {
				channelData.val = bundle.rawData[chName].val;
				channelData.channelName = chName;
			}

			// Save the channel data to the bundle channelData object.  The
			// data should be organized by the channel's "name".
			channelData.channelName = chName;
			channelData.type = type;
			channelData.ioNum = ioNum;
			bundle.channelData[chName] = channelData;
		});

		return bundle;
	};
}

async function t4DataCollector(device) {
		var bundle = {
			'device': device,
			'testData': 'test',
			'channelData': {},
			'rawData': {},
			'ainChannelsToRead': [],
			'ainChannelsData': {},
			'dioChannelsData': {},
		};

		try {
			await t4CollectGeneralData(bundle);
			await t4CollectAINData(bundle);
			await genericOrganizeDIOData(bundle);
			await getDataOrganizer(t4Channels)(bundle);
			debugT4CD('T4 Channel Data', bundle.channelData);
			return bundle.channelData;
		} catch (err) {
			errorLog('t4DataCollector ERROR', err);
			return err;
		}
}

function getGeneralDataCollector(numAnalogChannels) {
	var registersToRead = ['DIO_STATE', 'DIO_DIRECTION'];
	var i = 0;
	// Add analog input registers
	for(i = 0; i < numAnalogChannels; i++) {
		registersToRead.push('AIN' + i.toString());
	}
	// Add analog output registers
	for(i = 0; i < 2; i++) {
		registersToRead.push('DAC' + i.toString());
	}

	return function collectGeneralData(bundle) {
		return new Promise((resolve, reject) => {

			var device = bundle.device;

			device.sReadMany(registersToRead)
				.then((results) => {
					var dt = device.savedAttributes.deviceType;
					if (dt === 5) {
						debugT5DC('Collected T5 Data', results);
					} else if (dt === 7) {
						debugT7DC('Collected T7 Data', results);
					} else if (dt === 8) {
						debugT8DC('Collected T8 Data', results);
					} else {
						errorLog('Unknown dt Results:', dt, results);
					}

					// Transfer the collected data to the "data" object.
					results.forEach((result) => {
						bundle.rawData[result.name] = result;
					});

					for (var i = 0; i < numAnalogChannels; i++) {
						var channelStr = 'AIN' + i.toString();
						bundle.ainChannelsData[channelStr] = {
							'channelName': channelStr,
							'val': bundle.rawData[channelStr].val,
						};
					}
					resolve(bundle);
				})
				.catch((err) => {
					errorLog('T5 & T7 Dash-DataCollector-Error', err);
					resolve(bundle);
				});

		});
	};
}

function t5DataCollector(device) {
	return new Promise((resolve, reject) => {


		var data = {
			'device': device,
			'channelData': {},
			'rawData': {},
			'ainChannelsData': {},
			'dioChannelsData': {},
		};

		getGeneralDataCollector(T5_NUM_ANALOG_CHANNELS)(data)
			.then(genericOrganizeDIOData)
			.then(getDataOrganizer(t5Channels))
			.then((bundle) => {
				debugT5CD('T5 Channel Data', bundle.channelData);
				resolve(bundle.channelData);
			})
			.catch((err) => {
				errorLog('t5DataCollector ERROR', err);
				resolve(err);
			});
	});
}
function t7DataCollector(device) {
	return new Promise((resolve, reject) => {


		var data = {
			'device': device,
			'channelData': {},
			'rawData': {},
			'ainChannelsData': {},
			'dioChannelsData': {},
		};

		getGeneralDataCollector(T7_NUM_ANALOG_CHANNELS)(data)
			.then(genericOrganizeDIOData)
			.then(getDataOrganizer(t7Channels))
			.then((bundle) => {
				debugT7CD('T7 Channel Data', bundle.channelData);
				resolve(bundle.channelData);
			})
			.catch((err) => {
				errorLog('t7DataCollector ERROR', err);
				resolve(err);
			});
	});
}
function t8DataCollector(device) {
	return new Promise((resolve, reject) => {


		var data = {
			'device': device,
			'channelData': {},
			'rawData': {},
			'ainChannelsData': {},
			'dioChannelsData': {},
		};

		getGeneralDataCollector(T8_NUM_ANALOG_CHANNELS)(data)
			.then(genericOrganizeDIOData)
			.then(getDataOrganizer(t8Channels))
			.then((bundle) => {
				debugT8CD('T8 Channel Data', bundle.channelData);
				resolve(bundle.channelData);
			})
			.catch((err) => {
				errorLog('t8DataCollector ERROR', err);
				resolve(err);
			});
	});
}

var dataCollectors = {
	'T4': t4DataCollector,
	'T5': t5DataCollector,
	'T7': t7DataCollector,
	'T8': t8DataCollector,
};

class DashboardDataCollector extends EventEmitter {
	constructor(deviceType) {
		super();

		this.deviceType = deviceType;

		debugCM('Creating a dashboard data collector object for:', deviceType);
		this.dataCollector = dataCollectors[deviceType];

		this.daqInterval = 1000;
		this.isRunning = false;
		this.intervalHandler = undefined;
		this.isCollecting = false;
	}

	collectionManager(device) {
		if(this.isCollecting) {
			errorLog('dashboard_data_collector is already collecting');
			return false;
		} else {
			this.isCollecting = true;
			try {
				this.dataCollector(device)
				.then((res) => {
					var dt = device.savedAttributes.deviceType;
					debugCM('dashboard_data_collector collected data - success', dt, res);
					this.emit('data', res);
					// We have data
					this.isCollecting = false;
				}, (err) => {
					errorLog('dashboard_data_collector collected data - error');
					// We have problems...
					this.isCollecting = false;
				})
				.catch((err) => {
					console.error('Error executing...', err);
					this.isCollecting = false;
				});
			} catch(err) {
				errorLog('Error executing data collector: ' + this.deviceType, err);
			}
			this.isCollecting = false;
		}
	}

	start(curatedDevice) {
		var started = false;
		if(this.isRunning){
			return started;
		} else {
			started = true;
			this.isRunning = true;
			// setInterval args: callback, interval, args...
			this.intervalHandler = setInterval(() => this.collectionManager(curatedDevice), this.daqInterval);
			return started;
		}
	}

	stop() {
		var stopped = false;
		if(this.isRunning) {
			clearInterval(this.intervalHandler);
			this.isRunning = false;
			stopped = true;
		}
		return stopped;
	}
}

module.exports.create = DashboardDataCollector;
