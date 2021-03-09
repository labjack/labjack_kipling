'use strict';

const EventEmitter = require('events').EventEmitter;
const dashboard_channel_parser = require('./dashboard_channel_parser');

const DEBUG_T4_DATA_COLLECTOR = false;
const DEBUG_T4_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.
const DEBUG_T4_READ_DATA = false;

const DEBUG_T5_DATA_COLLECTOR = false;
const DEBUG_T5_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

const DEBUG_T7_DATA_COLLECTOR = false;
const DEBUG_T7_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

const DEBUG_T8_DATA_COLLECTOR = false;
const DEBUG_T8_COLLECTED_DATA = false; //Enable print statements to debug collected & organized data.

const DEBUG_COLLECTION_MANAGER = false;
const ENABLE_ERROR_OUTPUT = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

const debugT4DC = getLogger(DEBUG_T4_DATA_COLLECTOR);
const debugT4RD = getLogger(DEBUG_T4_READ_DATA);
const debugT4CD = getLogger(DEBUG_T4_COLLECTED_DATA);
const debugT5DC = getLogger(DEBUG_T5_DATA_COLLECTOR);
const debugT5CD = getLogger(DEBUG_T5_COLLECTED_DATA);
const debugT7DC = getLogger(DEBUG_T7_DATA_COLLECTOR);
const debugT7CD = getLogger(DEBUG_T7_COLLECTED_DATA);
const debugT8DC = getLogger(DEBUG_T8_DATA_COLLECTOR);
const debugT8CD = getLogger(DEBUG_T8_COLLECTED_DATA);
const debugCM = getLogger(DEBUG_COLLECTION_MANAGER);
const errorLog = getLogger(ENABLE_ERROR_OUTPUT);

const T4_NUM_ANALOG_CHANNELS = 12;
const T5_NUM_ANALOG_CHANNELS = 8;
const T7_NUM_ANALOG_CHANNELS = 14;
const T8_NUM_ANALOG_CHANNELS = 8;

const t4Channels = dashboard_channel_parser.channels.T4;
const t5Channels = dashboard_channel_parser.channels.T5;
const t7Channels = dashboard_channel_parser.channels.T7;
const t8Channels = dashboard_channel_parser.channels.T8;

function t4CollectGeneralData(bundle) {
	return new Promise((resolve) => {
		const device = bundle.device;

		const registersToRead = ['DIO_ANALOG_ENABLE', 'DIO_STATE', 'DIO_DIRECTION'];
		// Add analog output registers
		for (let i = 0; i < 2; i++) {
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
				const binaryStr = bundle.rawData.DIO_ANALOG_ENABLE.binaryStr.split('b').join('');

				// Flip the string so that it can be traversed for AIN0 -> AINxx order.
				const flippedStr = binaryStr.split('').reverse().join('');

				const channelsToRead = [];
				const ainChannels = {};
				for (let i = 0; i < T4_NUM_ANALOG_CHANNELS; i++) {
					let channelEnabled = ((typeof (flippedStr[i]) !== 'undefined') && (flippedStr[i] === '1'));

					const channelStr = 'AIN' + i.toString();
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
		const device = bundle.device;
		const channelsToRead = bundle.ainChannelsToRead;

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
	const dioStateBinStr = bundle.rawData.DIO_STATE.binaryStr.split('b').join('');
	const dioDirBinStr = bundle.rawData.DIO_DIRECTION.binaryStr.split('b').join('');

	// Flip the strings so that they can be traversed xx0 -> xx100.
	const dioStateFlipStr = dioStateBinStr.split('').reverse().join('');
	const dioDirFlipStr = dioDirBinStr.split('').reverse().join('');

	const dioChannels = {};
	const numDIOChannels = 23; // FIO0 -> MIO2
	for (let i = 0; i < numDIOChannels; i++) {
		// Logic to populate dioState
		let dioState = 0;
		let dioStateStr = 'Low';
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
		let dioDirection = 0;
		let dioDirectionStr = 'Input';
		if (typeof (dioDirFlipStr[i]) !== 'undefined') {
			if (dioDirFlipStr[i] === '1') {
				dioDirection = 1;
				dioDirectionStr = 'Output';
			} else {
				dioDirection = 0;
				dioDirectionStr = 'Input';
			}
		}

		let strPrefix = 'DIO';
		let strChNumOffset = 0;
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
		const channelStr = 'DIO' + i.toString();
		const channelNameStr = strPrefix + (i - strChNumOffset).toString();
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

		const allAINData = bundle.ainChannelsData;
		const allDIOData = bundle.dioChannelsData;
		// const ainKeys = Object.keys(allAINData);
		// const dioKeys = Object.keys(allDIOData);

		// Loop through the t4 "channels" to organize the collected data.
		Object.keys(deviceChannels).forEach((key, i) => {
			const channelData = {};
			const deviceChannel = deviceChannels[key];
			const type = deviceChannel.type;
			const ioNum = deviceChannel.ioNum;
			const chName = deviceChannel.name;

			const ainKey = 'AIN' + ioNum;
			const dioKey = 'DIO' + ioNum;

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
		const bundle = {
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
	const registersToRead = ['DIO_STATE', 'DIO_DIRECTION'];
	// Add analog input registers
	for(let i = 0; i < numAnalogChannels; i++) {
		registersToRead.push('AIN' + i.toString());
	}
	// Add analog output registers
	for(let i = 0; i < 2; i++) {
		registersToRead.push('DAC' + i.toString());
	}

	return function collectGeneralData(bundle) {
		return new Promise((resolve) => {

			const device = bundle.device;

			device.sReadMany(registersToRead)
				.then((results) => {
					const dt = device.savedAttributes.deviceType;
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

					for (let i = 0; i < numAnalogChannels; i++) {
						const channelStr = 'AIN' + i.toString();
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
	return new Promise((resolve) => {
		const data = {
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
	return new Promise((resolve) => {
		const data = {
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
	return new Promise((resolve) => {
		const data = {
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

const dataCollectors = {
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
		if (this.isCollecting) {
			errorLog('dashboard_data_collector is already collecting');
			return false;
		} else {
			this.isCollecting = true;
			try {
				this.dataCollector(device)
					.then((res) => {
						const dt = device.savedAttributes.deviceType;
						debugCM('dashboard_data_collector collected data - success', dt, res);
						this.emit('data', res);
						// We have data
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
		if (this.isRunning){
			return false;
		} else {
			this.isRunning = true;
			// setInterval args: callback, interval, args...
			this.intervalHandler = setInterval(() => this.collectionManager(curatedDevice), this.daqInterval);
			return true;
		}
	}

	stop() {
		if (this.isRunning) {
			clearInterval(this.intervalHandler);
			this.isRunning = false;
			return true;
		}
		return false;
	}
}

module.exports = DashboardDataCollector;
