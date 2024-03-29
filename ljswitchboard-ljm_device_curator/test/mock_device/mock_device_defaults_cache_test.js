
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm = require('labjack-nodejs').driver_const;


var device;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

deviceFound = false;

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
	'createDevice': function(test) {
		console.log('');
		console.log('**** mock_device_test ****');
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			done();
		}, function(err) {
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			assert.strictEqual(res.connectionType, 1);
			assert.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			done();
		});
	},
	'check defaults cache': function(test) {
		device.getUnsavedDefaults()
		.then(function(res) {
			var expectedRes = {};
			assert.deepEqual(res, expectedRes);
			done();
		});
	},
	'write defaults': function(test) {
		if(device.isMockDevice) {
			device.qWrite('POWER_WIFI_DEFAULT', 0)
			.then(device.getUnsavedDefaults)
			.then(function(res) {
				var expectedRes = {
					'POWER_WIFI_DEFAULT': 0
				};
				assert.deepEqual(res, expectedRes);
				done();
			});
		} else {
			done();
		}
	},
	'write many defaults': function(test) {
		if(device.isMockDevice) {
			device.qWriteMany(['DAC0', 'POWER_WIFI_DEFAULT', 'POWER_ETHERNET_DEFAULT'], [0, 1, 0])
			.then(device.getUnsavedDefaults)
			.then(function(res) {
				var expectedRes = {
					'POWER_WIFI_DEFAULT': 1,
					'POWER_ETHERNET_DEFAULT': 0
				};
				assert.deepEqual(res, expectedRes);
				done();
			});
		} else {
			done();
		}
	},
	'write many defaults (qrwMany)': function(test) {
		if(device.isMockDevice) {
			device.qrwMany(
				['DAC0', 'POWER_WIFI_DEFAULT', 'POWER_WIFI_DEFAULT'],			// addresses
				[ljm.LJM_WRITE, ljm.LJM_WRITE, ljm.LJM_READ],					// directions
				[2,1,1],														// numValues
				[0,0, 0, 1])													// values
			.then(device.getUnsavedDefaults)
			.then(function(res) {
				var expectedRes = {
					'POWER_WIFI_DEFAULT': 0,
					'POWER_ETHERNET_DEFAULT': 0
				};
				assert.deepEqual(res, expectedRes);
				done();
			});
		} else {
			done();
		}
	},
	'clear defaults cache': function(test) {
		if(device.isMockDevice) {
			device.clearUnsavedDefaults()
			.then(device.getUnsavedDefaults)
			.then(function(res) {
				var expectedRes = {};
				assert.deepEqual(res, expectedRes);
				done();
			});
		} else {
			done();
		}
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	}
};
