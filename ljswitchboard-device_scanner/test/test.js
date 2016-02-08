
process.on('uncaughtException', function(err) {
    console.log('ERROR!!!', err);
    console.log(err.stack);
    process.exit();
});

var GET_LJM_VERSION = true;
var BASIC_TEST = false;
var MOCK_TEST = false;
var SCAN_CONNECTED_DEVICES = true;
var CRAZY_TEST = false;


if(GET_LJM_VERSION) {
	var get_ljm_version = require('./get_ljm_version');
	exports.get_ljm_version = get_ljm_version.tests;
}

if(BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.tests;
}

if(MOCK_TEST) {
	var mock_test = require('./mock_test');
	exports.mock_test = mock_test.tests;
}

if(SCAN_CONNECTED_DEVICES) {
	var scan_connected_devices = require('./scan_connected_devices');
	exports.scan_connected_devices = scan_connected_devices.tests;
}

if(CRAZY_TEST) {
	var crazy_test = require('./crazy_test');
	exports.crazy_test = crazy_test.tests;
}