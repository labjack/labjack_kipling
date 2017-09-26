
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;

var ENABLE_ERROR_OUTPUT = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var errorLog = getLogger(ENABLE_ERROR_OUTPUT);


var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var device = undefined;

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
		console.log('**** external_app_tests - basic_test.js ****');

		try {
            device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevices': function(test) {
        var td = {
            'dt': 'LJM_dtT4',
            'ct': 'LJM_ctUSB',
            'id': 'LJM_idANY',
        };

        // Open the device.
        device.open(td.dt, td.ct, td.id)
        .then(function(res) {
            test.done();
        }, function(err) {
            console.log('Error Opening', td);
            test.ok(false);
            stopTest(test, err);
            test.done();
        });
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
        .then(function(res) {
            var keys = ['deviceTypeName', 'productType', 'serialNumber'];
            var info = {};
            keys.forEach(function(key) {
                info[key] = res[key];
            });
            test.done();
        }, function(err) {
            test.ok(false, 'there was an error getting attributes: ' + JSON.stringify(err));
            test.done();
        });
	},
    'open device in LJLogM': function(test) {
        device.openDeviceInExternalApplication('LJLogM')
        .then(function(res) {
            test.done();
        }, function(err) {
            test.done();
        });
    },
    'open device in LJLogM(2)': function(test) {
        device.openDeviceInLJLogM()
        .then(function(res) {
            test.done();
        }, function(err) {
            test.done();
        });
    },
    'open device in LJStreamM': function(test) {
        device.openDeviceInLJStreamM()
        .then(function(res) {
            test.done();
        }, function(err) {
            test.done();
        });
    },
    'perform test read': function(test) {
        device.read('AIN0')
        .then(function(res) {
            test.ok(true, 'device is still connected');
            test.done();
        }, function(err) {
            console.error('LJM Error:', err);
            test.ok(false, 'device should still be connected');
            test.done();
        });
    },
	'closeDevices': function(test) {
        device.close()
        .then(function(res) {
            test.done();
        }, function(err) {
            test.ok(false, 'there was an error closing: ' + JSON.stringify(err));
				test.done();
        });
	},
};