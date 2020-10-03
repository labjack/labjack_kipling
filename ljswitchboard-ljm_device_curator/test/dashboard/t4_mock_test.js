
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;

var DEBUG_DASHBOARD_OPERATIONS = false;
var DEBUG_DASHBOARD_GET_ALL = false;
var DEBUG_DASHBOARD_UPDATE = false;
var DEBUG_DEVICE_ATTRIBUTES = false;
var DEBUG_DASHBOARD_TEST_FUNC = false;
var DEBUG_DASHBOARD_START = true;
var DEBUG_DASHBOARD_DATA_COLLECTOR = true;
var DEBUG_DASHBOARD_STOP = true;
var ENABLE_ERROR_OUTPUT = true;

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
var debugDA = getLogger(DEBUG_DEVICE_ATTRIBUTES);
var debugDTF = getLogger(DEBUG_DASHBOARD_TEST_FUNC);
var debugDStart = getLogger(DEBUG_DASHBOARD_START);
var debugDDC = getLogger(DEBUG_DASHBOARD_DATA_COLLECTOR);
var debugDStop = getLogger(DEBUG_DASHBOARD_STOP);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

var t4Device;
var t5Device;
var t7Device;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceInfo = {
	'T4': {
		'isMockDevice': true,
		'ct': 'USB',
		// 'serialNumber': 44001000,
		'serialNumber': 440010006,
		'DEVICE_NAME_DEFAULT': 'My Test T4',
		'ipAddress': '192.168.1.101',
		'ETHERNET_IP': '192.168.1.101',
	},
};
var devicesToMake = [];
var deviceInfoKeys = Object.keys(deviceInfo);
for(var i = 0; i < deviceInfoKeys.length; i++) {
	var deviceInfoKey = deviceInfoKeys[i];
	var devInfo = deviceInfo[deviceInfoKey];
	devicesToMake.push({
		'dt': deviceInfoKey,
		'ct': 'USB',
		'sn': devInfo.serialNumber,
		'isMockDevice': devInfo.isMockDevice,
		'data': devInfo,
	});
}

var devices = {};

var infoMapping = {
	'SERIAL_NUMBER': 'serialNumber',
};
var appropriateResultMap = {
	// 'ETHERNET_IP': 'str',
	// 'WIFI_IP': 'str',
	// 'SERIAL_NUMBER': 'res',
};
deviceFound = false;

var dashboardUID = 'basic-test-dashboard';

var dashboardTesters = {};
function createDashboardTester(device) {
	this.numDataCollected = 0;
	this.maxNumIterations = 10000;
	this.stopDefered = undefined;
	this.actions = [];

	function dashboardDataUpdate(data) {

		console.log(JSON.stringify({
			'iteration': self.numDataCollected,
			'dt': device.savedAttributes.deviceType,
			'sn': device.savedAttributes.serialNumber,
			'data': Object.keys(data),
		}));
		var action;
		var isValidAction = false;
		if(self.actions[self.numDataCollected]) {
			action = self.actions[self.numDataCollected];
			isValidAction = true;
		}

		if(isValidAction) {
			device.dashboard_configIO(
				action.channelName,
				action.attribute,
				action.value
			)
			.then(function(result) {
				// console.log('Completed action', action, result);
			})
			.catch(function(err) {
				console.log('Error executing action', action, err);
			});
		}

		self.numDataCollected += 1;
		if(self.numDataCollected > self.maxNumIterations) {
			if(typeof(self.stopDefered) === 'function') {
				// Remove the data event listener;
				device.removeListener('DASHBOARD_DATA_UPDATE', dashboardDataUpdate);

				device.dashboard_stop(dashboardUID)
				.then(function(result) {
					console.log('dashboard tester stop success...', result);
					// Resolve the "waitForStop" promise;
					self.stopDefered({'numIterations': self.numDataCollected});
				})
				.catch(function(err) {
					console.log('dashboard tester stop Error...', err);
					// Resolve the "waitForStop" promise;
					self.stopDefered({'numIterations': self.numDataCollected});
				});

			}
		}
	}

	this.startTester = function() {
		device.on('DASHBOARD_DATA_UPDATE', dashboardDataUpdate);

		return device.dashboard_start(dashboardUID);
	};
	this.waitForStop = function(numIterations, actions) {
		// console.log('Actions...', actions);
		var defered = q.defer();
		self.stopDefered = defered.resolve;
		self.maxNumIterations = numIterations;
		self.actions = actions;
		return defered.promise;
	};
	var self = this;
}
exports.tests = {
	'setUp': function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	},
	'tearDown': function(callback) {
		callback();
	},
	'createDevices': function(test) {
		console.log('');
		console.log('**** mock_device_test ****');

		try {
			devicesToMake.forEach(function(deviceToMake) {
				devices[deviceToMake.sn] = new device_curator.device(deviceToMake.isMockDevice);
			});
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'configure mock devices': function(test) {
		var promises = [];
		devicesToMake.forEach(function(deviceToMake) {
			promises.push(devices[deviceToMake.sn].configureMockDevice(deviceToMake.data));
		});

		q.allSettled(promises)
		.then(function(res) {
			done();
		});
	},
	'openDevices': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			var td = {
				'dt': deviceToMake.dt,
				'ct': deviceToMake.ct,
				'id': deviceToMake.sn.toString(),
			};
			var openDefered = q.defer();

			// Open the device.
			devices[deviceToMake.sn].open(td.dt, td.ct, td.id)
			.then(function(res) {
				openDefered.resolve();
			}, function(err) {
				console.log('Error Opening', td);
				errors.push(err);
				openDefered.resolve();
			});

			// Save the promise
			promises.push(openDefered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error opening: ' + JSON.stringify(errors));
				done();
			}
		});
	},
	'checkDeviceInfo': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			// Close the device
			var openDefered = q.defer();
			devices[deviceToMake.sn].getDeviceAttributes()
			.then(function(res) {
				var keys = ['deviceTypeName', 'productType', 'serialNumber'];
				var info = {};
				keys.forEach(function(key) {
					info[key] = res[key];
				});
				debugDA('device Attributes', info);
				openDefered.resolve();
			}, function(err) {
				errors.push(err);
				openDefered.resolve();
			});

			// Save the promise;
			promises.push(openDefered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error getting attributes: ' + JSON.stringify(errors));
				done();
			}
		});
	},
	'execute dashboard_testFunc': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			// Close the device
			var openDefered = q.defer();
			devices[deviceToMake.sn].dashboard_testFunc()
			.then(function(res) {
				debugDTF('dashboard_testFunc', res);
				openDefered.resolve();
			}, function(err) {
				errors.push(err);
				openDefered.resolve();
			});

			// Save the promise;
			promises.push(openDefered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error executing testFunc: ' + JSON.stringify(errors));
				done();
			}
		});
	},
	'start dashboard listeners': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			var defered = q.defer();

			// Create dashboard testing object.
			dashboardTesters[deviceToMake.sn] = new createDashboardTester(devices[deviceToMake.sn]);

			// Start the dashboard tester.
			dashboardTesters[deviceToMake.sn].startTester()
			.then(function(res) {
				debugDStart('!! Started Dashboard For', deviceToMake.sn, deviceToMake.dt);
				// debugDStart('dashboard_start', res);
				defered.resolve();
			}, function(err) {
				errors.push(err);
				defered.resolve();
			});

			// Save the promise;
			promises.push(defered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error starting: ' + JSON.stringify(errors));
				done();
			}
		});
	},
	'stop dashboard listeners': function(test) {
		var promises = [];
		var errors = [];

		var actions = {
			'T4': [{
				channelName: 'FIO4',
				attribute: 'analogEnable',
				value: 'enable',
			}, {
				channelName: 'FIO4',
				attribute: 'analogEnable',
				value: 'disable',
			}, {
				channelName: 'FIO4',
				attribute: 'digitalDirection',
				value: 'output',
			}, {
				channelName: 'FIO4',
				attribute: 'digitalState',
				value: 'high',
			}, {
				channelName: 'FIO4',
				attribute: 'digitalState',
				value: 'low',
			}, {
				channelName: 'FIO4',
				attribute: 'digitalDirection',
				value: 'input',
			}, {
				channelName: 'DAC0',
				attribute: 'analogValue',
				value: 1.314,
			}, {
				channelName: 'DAC0',
				attribute: 'analogValue',
				value: 3.14,
			}],
			'T5': [],
			'T7': [{
				channelName: 'FIO0',
				attribute: 'digitalDirection',
				value: 'output',
			}, {
				channelName: 'FIO0',
				attribute: 'digitalState',
				value: 'high',
			}, {
				channelName: 'FIO0',
				attribute: 'digitalState',
				value: 'low',
			}, {
				channelName: 'FIO0',
				attribute: 'digitalDirection',
				value: 'input',
			}, {
				channelName: 'DAC0',
				attribute: 'analogValue',
				value: 1.314,
			}, {
				channelName: 'DAC0',
				attribute: 'analogValue',
				value: 3.14,
			}],
		};
		devicesToMake.forEach(function(deviceToMake) {
			var defered = q.defer();
			dashboardTesters[deviceToMake.sn].waitForStop(10, actions[deviceToMake.dt])

			// // Close the device
			// var openDefered = q.defer();
			// devices[deviceToMake.sn].dashboard_stop(dashboardUID)
			.then(function(res) {
				debugDStop('dashboard_stop', res);
				defered.resolve();
			}, function(err) {
				errors.push(err);
				defered.resolve();
			});

			// Save the promise;
			promises.push(defered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error stopping: ' + JSON.stringify(errors));
				done();
			}
		});
	},
	// 'Read Device Attributes': function(test) {
	// 	var results = [];
	// 	// Setup and call functions
	// 	qExec(device, 'iRead', 'ETHERNET_IP')(results)
	// 	.then(qExec(device, 'iRead', 'SERIAL_NUMBER'))
	// 	.then(function(res) {
	// 		// console.log('Res', res);
	// 		res.forEach(function(readRes) {
	// 			var readData = readRes.retData;
	// 			var name = readData.name;
	// 			var resData;
	// 			if(appropriateResultMap[name]) {
	// 				resData = readData[appropriateResultMap[name]];
	// 			} else {
	// 				resData = readData.val;
	// 			}

	// 			if(deviceInfo[name]) {
	// 				assert.strictEqual(resData, deviceInfo[name]);
	// 			} else if(infoMapping[name]) {
	// 				assert.strictEqual(resData, deviceInfo[infoMapping[name]]);
	// 			}
	// 			// console.log(name, resData);
	// 		});
	// 		done();
	// 	});
	// },
	'closeDevices': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			// Close the device
			var openDefered = q.defer();
			devices[deviceToMake.sn].close()
			.then(function(res) {
				openDefered.resolve();
			}, function(err) {
				errors.push(err);
				openDefered.resolve();
			});

			// Save the promise;
			promises.push(openDefered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				done();
			} else {
				assert.isOk(false, 'there was an error closing: ' + JSON.stringify(errors));
				done();
			}
		});
	},
};
