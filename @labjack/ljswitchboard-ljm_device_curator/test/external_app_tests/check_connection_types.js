
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;

var ENABLE_ERROR_OUTPUT = true;
var events = device_curator.device_events;

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

var got_DEVICE_RELEASED = false;
var got_DEVICE_ACQUIRED = false;
var numAttrsChanged = 0;
var numDisconnects = 0;
var numConnects = 0;


function deviceReleasedCB(data) {
    console.log('  - Got DEVICE_RELEASED CB'.yellow);
    // console.log('Device Name',data.attrs.DEVICE_NAME_DEFAULT); // Print out device attribute.
    got_DEVICE_RELEASED = true;
}
function deviceAcquiredCB(data) {
    console.log('  - Got DEVICE_ACQUIRED CB'.green);
    // console.log('Device Name',data.attrs.DEVICE_NAME_DEFAULT); // Print out device attribute.
    got_DEVICE_ACQUIRED = true;
}
function deviceAttrsChangedCB(data) {
    numAttrsChanged += 1;
    console.log('  - Got DEVICE_ATTRIBUTES_CHANGED CB'.red);
    // console.log('Device Name',data.DEVICE_NAME_DEFAULT); // Print out device attribute.
}
function deviceDisconnectedCB(data) {
    numDisconnects += 1;
    console.log('  - Got DEVICE_DISCONNECTED CB'.yellow);
    // console.log('Device Name',data.DEVICE_NAME_DEFAULT); // Print out device attribute.
}
function deviceReconnectedCB(data) {
    numConnects += 1;
    console.log('  - Got DEVICE_RECONNECTED CB'.green);
    // console.log('Device Name',data.DEVICE_NAME_DEFAULT); // Print out device attribute.
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
            'dt': 'LJM_dtANY',
            'ct': 'LJM_ctUSB',
            'id': 'LJM_idANY',
            // 'ct': 'LJM_ctEthernet',
            // 'id': 'LJM_idANY',
            // 'id': '470010414'
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

        device.on(events.DEVICE_RELEASED, deviceReleasedCB);
        device.on(events.DEVICE_ACQUIRED, deviceAcquiredCB);
        device.on(events.DEVICE_ATTRIBUTES_CHANGED, deviceAttrsChangedCB);
        device.on(events.DEVICE_DISCONNECTED, deviceDisconnectedCB);
        device.on(events.DEVICE_RECONNECTED, deviceReconnectedCB);
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
    'check device connection types': function(test) {
        device.cGetAvailableConnectionTypes()
        .then(function(res) {
            console.log('Available CTs'.green, res);
            test.done();
        }, function(err) {
            test.done();
        });
    },
    // 'open device in LJLogM': function(test) {
    //     device.openDeviceInExternalApplication('LJLogM','USB')
    //     .then(function(res) {
    //         test.ok(got_DEVICE_RELEASED, 'should have gotten DEVICE_RELEASED cb');
    //         test.ok(got_DEVICE_ACQUIRED, 'should have gotten DEVICE_ACQUIRED cb');
    //         console.log('Num Times Attrs Changed'.green, numAttrsChanged);
    //         // console.log('Open in App (external_app_tests/basic_test.js)', res);
    //         test.done();
    //     }, function(err) {
    //         test.done();
    //     });
    // },
    // 'open device in LJLogM(2)': function(test) {
    //     device.openDeviceInLJLogM()
    //     .then(function(res) {
    //         test.done();
    //     }, function(err) {
    //         test.done();
    //     });
    // },
    // 'open device in LJStreamM': function(test) {
    //     device.openDeviceInLJStreamM()
    //     .then(function(res) {
    //         test.done();
    //     }, function(err) {
    //         test.done();
    //     });
    // },
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