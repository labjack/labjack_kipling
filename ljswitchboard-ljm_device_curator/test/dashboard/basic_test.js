
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;


var t4Device;
var t5Device;
var t7Device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceInfo = {
	't4': {
		'serialNumber': 44001000,
		'DEVICE_NAME_DEFAULT': 'My Test T4',
		'ipAddress': '192.168.1.101',
		'ETHERNET_IP': '192.168.1.101',
	},
	't5': {
		'serialNumber': 45001000,
		'DEVICE_NAME_DEFAULT': 'My Test T5',
		'ipAddress': '192.168.1.101',
		'ETHERNET_IP': '192.168.1.101',
	},
	't7': {
		'serialNumber': 47001000,
		'DEVICE_NAME_DEFAULT': 'My Test T7',
		'ipAddress': '192.168.1.101',
		'ETHERNET_IP': '192.168.1.101',
	}
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
				devices[deviceToMake.sn] = new device_curator.device(true);
			});
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'configure mock devices': function(test) {
		var promises = [];
		devicesToMake.forEach(function(deviceToMake) {
			promises.push(devices[deviceToMake.sn].configureMockDevice(deviceToMake.data));
		});

		q.allSettled(promises)
		.then(function(res) {
			test.done();
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
				errors.push(err);
				openDefered.resolve();
			});

			// Save the promise
			promises.push(openDefered.promise);
		});

		q.allSettled(promises)
		.then(function(res) {
			if(errors.length === 0) {
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
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
				console.log('device Attributes', info);
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
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
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
				console.log('dashboard_testFunc', res);
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
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
			}
		});
	},
	'start dashboard listeners': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			// Close the device
			var openDefered = q.defer();
			devices[deviceToMake.sn].dashboard_start(dashboardUID)
			.then(function(res) {
				console.log('dashboard_testFunc', res);
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
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
			}
		});
	},
	'stop dashboard listeners': function(test) {
		var promises = [];
		var errors = [];

		devicesToMake.forEach(function(deviceToMake) {
			// Close the device
			var openDefered = q.defer();
			devices[deviceToMake.sn].dashboard_stop(dashboardUID)
			.then(function(res) {
				console.log('dashboard_testFunc', res);
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
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
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
	// 				test.strictEqual(resData, deviceInfo[name]);
	// 			} else if(infoMapping[name]) {
	// 				test.strictEqual(resData, deviceInfo[infoMapping[name]]);
	// 			}
	// 			// console.log(name, resData);
	// 		});
	// 		test.done();
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
				test.done();
			} else {
				test.ok(false, 'there was an error: ' + JSON.stringify(errors));
				test.done();
			}
		});
	},
};