
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var dashboard_channels = require('./dashboard_channels.json');
var dashboard_channel_parser = require('./dashboard_channel_parser');

var DEBUG_T4_DATA_COLLECTOR = false;
var DEBUG_T4_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.
var DEBUG_T4_READ_DATA = false;

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
	var defered = q.defer();
	var device = bundle.device;

	var registersToRead = ['DIO_ANALOG_ENABLE', 'DIO_STATE', 'DIO_DIRECTION'];
	var i = 0;
	// Add analog output registers
	for(i = 0; i < 2; i++) {
		registersToRead.push('DAC' + i.toString());
	}

	device.sReadMany(registersToRead)
	.then(function(results) {
		debugT4RD('Collected T4 General Data', results);

		// Transfer the collected data to the "data" object.
		results.forEach(function(result) {
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
		for(var i = 0; i < numADCChannels; i++) {
			var channelEnabled = false;
			if(typeof(flippedStr[i]) !== 'undefined') {
				if(flippedStr[i] === '1') {
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

			if(channelEnabled) {
				channelsToRead.push(channelStr);
			}
		}
		bundle.ainChannelsToRead = channelsToRead;
		bundle.ainChannelsData = ainChannels;
		defered.resolve(bundle);
	})
	.catch(function(err) {
		errorLog('T4 Dash-DataCollector-GenData-Error', err);
		defered.resolve(bundle);
	}).done();
	
	return defered.promise;
}

function t4CollectAINData(bundle) {
	var defered = q.defer();
	var device = bundle.device;
	var channelsToRead = bundle.ainChannelsToRead;

	debugT4DC('AIN Channels to read', channelsToRead);
	device.sReadMany(channelsToRead)
	.then(function(results) {
		debugT4RD('Collected T4 AIN Data', results);

		// Transfer the collected data to the "data" object.
		results.forEach(function(result) {
			bundle.rawData[result.name] = result;
			bundle.ainChannelsData[result.name].val = result.val;
		});
		defered.resolve(bundle);
	})
	.catch(function(err) {
		defered.resolve(bundle);
	})
	.done();

	return defered.promise;
}

function genericOrganizeDIOData(bundle) {
	var defered = q.defer();
	// Binary Strings start out as 'b101010'
	// Remove the 'b' from the binary string.
	var dioStateBinStr = bundle.rawData.DIO_STATE.binaryStr.split('b').join('');
	var dioDirBinStr = bundle.rawData.DIO_DIRECTION.binaryStr.split('b').join('');

	// Flip the strings so that they can be traversed xx0 -> xx100.
	var dioStateFlipStr = dioStateBinStr.split('').reverse().join('');
	var dioDirFlipStr = dioDirBinStr.split('').reverse().join('');

	var dioChannels = {};
	var numDIOChannels = 23; // FIO0 -> MIO2
	for(var i = 0; i < numDIOChannels; i++) {
		// Logic to populate dioState
		var dioState = 0;
		var dioStateStr = 'Low';
		if(typeof(dioStateFlipStr[i]) !== 'undefined') {
			if(dioStateFlipStr[i] === '1') {
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
		if(typeof(dioDirFlipStr[i]) !== 'undefined') {
			if(dioDirFlipStr[i] === '1') {
				dioDirection = 1;
				dioDirectionStr = 'Output';
			} else {
				dioDirection = 0;
				dioDirectionStr = 'Input';
			}
		}
		
		var strPrefix = 'DIO';
		var strChNumOffset = 0;
		if(0 <= i && i <= 7) {
			strChNumOffset = 0;
			strPrefix = 'FIO';
		} else  if(8 <= i && i <= 15) {
			strChNumOffset = 8;
			strPrefix = 'EIO';
		} else  if(16 <= i && i <= 19) {
			strChNumOffset = 16;
			strPrefix = 'CIO';
		} else  if(20 <= i && i <= 22) {
			strChNumOffset = 20;
			strPrefix = 'MIO';
		}
		var channelStr = 'DIO' + i.toString();
		var channelNameStr = strPrefix + (i-strChNumOffset).toString();
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

	defered.resolve(bundle);
	return defered.promise;
}



function getDataOrganizer(deviceChannels) {
	return function dataOrganizer(bundle) {
		var defered = q.defer();

		// console.log('ainChannelsData', bundle.ainChannelsData);
		// console.log('dioChannelsData', bundle.dioChannelsData);

		var allAINData = bundle.ainChannelsData;
		var allDIOData = bundle.dioChannelsData;
		// var ainKeys = Object.keys(allAINData);
		// var dioKeys = Object.keys(allDIOData);

		// Loop through the t4 "channels" to organize the collected data.
		Object.keys(deviceChannels).forEach(function(key, i) {
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
			if(type === 'AIN') {
				// Add the collected AIN data if it exists.
				if(typeof(allAINData[ainKey]) !== 'undefined') {
					Object.keys(allAINData[ainKey]).forEach(function(key) {
						channelData[key] = allAINData[ainKey][key];
					});
				}
			} else if(type === 'FLEX') {
				// Add the collected AIN data if it exists.
				if(typeof(allAINData[ainKey]) !== 'undefined') {
					Object.keys(allAINData[ainKey]).forEach(function(key) {
						channelData[key] = allAINData[ainKey][key];
					});
				}
				// Add the collected DIO data if it exists.
				if(typeof(allDIOData[dioKey]) !== 'undefined') {
					Object.keys(allDIOData[dioKey]).forEach(function(key) {
						channelData[key] = allDIOData[dioKey][key];
					});
				}
			} else if(type === 'DIO') {
				// Add the collected DIO data if it exists.
				if(typeof(allDIOData[dioKey]) !== 'undefined') {
					Object.keys(allDIOData[dioKey]).forEach(function(key) {
						channelData[key] = allDIOData[dioKey][key];
					});
				}
			} else if(type === 'AO') {
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

		defered.resolve(bundle);
		return defered.promise;
	};
}

function t4DataCollector(device) {
	var defered = q.defer();
	
	var data = {
		'device': device,
		'testData': 'test',
		'channelData': {},
		'rawData': {},
		'ainChannelsToRead': [],
		'ainChannelsData': {},
		'dioChannelsData': {},
	};

	t4CollectGeneralData(data)
	.then(t4CollectAINData)
	.then(genericOrganizeDIOData)
	.then(getDataOrganizer(t4Channels))
	.then(function(bundle) {
		debugT4CD('T4 Channel Data', bundle.channelData);
		defered.resolve(bundle.channelData);
	})
	.catch(function(err) {
		errorLog('t4DataCollector ERROR', err);
		defered.resolve(err);
	})
	.done();

	return defered.promise;
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
		var defered = q.defer();

		var device = bundle.device;

		device.sReadMany(registersToRead)
		.then(function(results) {
			var dt = device.savedAttributes.deviceType;
			if(dt === 5) {
				debugT5DC('Collected T5 Data', results);
			} else if(dt === 7) {
				debugT7DC('Collected T7 Data', results);
			}  else if(dt === 8) {
				debugT8DC('Collected T8 Data', results);
			} else {
				errorLog('Unknown dt Results:', dt, results);
			}

			// Transfer the collected data to the "data" object.
			results.forEach(function(result) {
				bundle.rawData[result.name] = result;
			});

			for(var i = 0; i < numAnalogChannels; i++) {
				var channelStr = 'AIN' + i.toString();
				bundle.ainChannelsData[channelStr] = {
					'channelName': channelStr,
					'val': bundle.rawData[channelStr].val,
				};
			}
			defered.resolve(bundle);
		})
		.catch(function(err) {
			errorLog('T5 & T7 Dash-DataCollector-Error', err);
			defered.resolve(bundle);
		}).done();

		return defered.promise;
	};
}

function t5DataCollector(device) {
	var defered = q.defer();

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
	.then(function(bundle) {
		debugT5CD('T5 Channel Data', bundle.channelData);
		defered.resolve(bundle.channelData);
	})
	.catch(function(err) {
		errorLog('t5DataCollector ERROR', err);
		defered.resolve(err);
	})
	.done();

	return defered.promise;
}
function t7DataCollector(device) {
	var defered = q.defer();

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
	.then(function(bundle) {
		debugT7CD('T7 Channel Data', bundle.channelData);
		defered.resolve(bundle.channelData);
	})
	.catch(function(err) {
		errorLog('t7DataCollector ERROR', err);
		defered.resolve(err);
	})
	.done();

	return defered.promise;
}
function t8DataCollector(device) {
	var defered = q.defer();

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
	.then(function(bundle) {
		debugT8CD('T8 Channel Data', bundle.channelData);
		defered.resolve(bundle.channelData);
	})
	.catch(function(err) {
		errorLog('t8DataCollector ERROR', err);
		defered.resolve(err);
	})
	.done();

	return defered.promise;
}

var dataCollectors = {
	'T4': t4DataCollector,
	'T5': t5DataCollector,
	'T7': t7DataCollector,
	'T8': t8DataCollector,
};

function createDashboardDataCollector(deviceType) {
	debugCM('Creating a dashboard data collector object for:', deviceType);
	var dataCollector = dataCollectors[deviceType];

	this.daqInterval = 1000;
	this.isRunning = false;
	this.intervalHandler = undefined;
	this.isCollecting = false;

	this.collectionManager = function(device) {
		if(self.isCollecting) {
			errorLog('dashboard_data_collector is already collecting');
			return false;
		} else {
			self.isCollecting = true;
			try {
				dataCollector(device)
				.then(function(res) {
					var dt = device.savedAttributes.deviceType;
					debugCM('dashboard_data_collector collected data - success', dt, res);
					self.emit('data', res);
					// We have data
					self.isCollecting = false;
				}, function(err) {
					errorLog('dashboard_data_collector collected data - error');
					// We have problems...
					self.isCollecting = false;
				})
				.catch(function(err) {
					console.error('Error executing...', err);
					self.isCollecting = false;
				});
			} catch(err) {
				errorLog('Error executing data collector: ' + deviceType, err);
			}
		}
	};

	this.start = function(curatedDevice) {
		var started = false;
		if(self.isRunning){
			return started;
		} else {
			started = true;
			self.isRunning = true;
			// setInterval args: callback, interval, args...
			self.intervalHandler = setInterval(self.collectionManager, self.daqInterval, curatedDevice);
			return started;
		}
	};

	this.stop = function() {
		var stopped = false;
		if(self.isRunning) {
			clearInterval(self.intervalHandler);
			self.isRunning = false;
			stopped = true;
		}
		return stopped;
	};

	var self = this;
}

util.inherits(createDashboardDataCollector, EventEmitter);

module.exports.create = createDashboardDataCollector;