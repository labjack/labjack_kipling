var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


var testGroups = {
	// 'get_ljm_version': true,
	'basic_test': false,							// Passing
	'simple_test': false,							// Passing
	'driver_controller_test': false,				// Passing

	// Tests the creation of a sub-sub process (for each device being its own process)
	'single_device_controller_test': false,			// incomplete

	// Tests for scanning devices.
	'device_scanning': {
		'device_scanner_test': false,				//
		'mock_device_scanner_test': false,			//
		'live_device_scanner_test': false,			//
		'usb_only_device_scanner_test': false,		//
	},

	// Device Controller tests
	'device_controller': {
		// Mock devices, no LabJacks required.
		'two_mock_devs_test': true,				// Passing
		'basic_mock_dev_test': true,				// Passing

		// Requires LabJack devices.
		'basic_live_test': false,					// Passing

		'open_advanced_test': false,				//
		'device_keeper_test': false,				//
		'device_keeper_live_test': false,			//
		'device_errors_test': false,				//
		'two_dev_live_test': true,
	},

	'update_mock_device_test': false,				//
	'update_usb_device_test': false,				//
	'mock_device_speed_test': false,				//
	't7_device_speed_test': false,					//

	'special_addresses': {
		'ljm_special_addresses_test': false,		//
	},

	'dashboard': {
		'dashboard_test': false,					//
	},

	'simple_logger': {
		'simple_logger_basic_test': false,			//
	},
};


/*
// enable/disable tests
var ENABLE_BASIC_TEST = true;						// Passing
var ENABLE_SIMPLE_TEST = false;						// Passing
var TEST_DRIVER_CONTROLLER = false;					// Passing

// Tests the creation of a sub-sub process (for each device being its own process)
var TEST_SINGLE_DEVICE_CONTROLLER = false;			// incomplete

// Tests the scanning for devices
var TEST_DEVICE_SCANNER = false;					// Passes but outputs a lot of text.
var TEST_MOCK_DEVICE_SCANNER = false;
var TEST_LIVE_DEVICE_SCANNER = false;
var TEST_USB_ONLY_DEVICE_SCANNER = false;
var TEST_USB_ONLY_DEVICE_SCANNER_CACHING = false;

var TEST_DEVICE_CONTROLLER = false;					// incomplete
var TEST_DEVICE_CONTROLLER_OPEN_CLOSE = false;		// Passing
var TEST_DEVICE_CONTROLLER_LIVE_DEVICE = false;		// Passing
var TEST_DEVICE_CONTROLLER_OPEN_ADVANCED = false;	// Passing
var TEST_DEVICE_KEEPER = false;						// Passing
var TEST_DEVICE_KEEPER_LIVE = false;				// Passing
var TEST_DEVICE_ERRORS = false;						// Passing
var TEST_UPDATE_MOCK_DEVICE = false;				// Passing
var TEST_UPDATE_USB_DEVICE = false;					// Passing

var MOCK_DEVICE_SPEED_TEST = false;
var T7_DEVICE_SPEED_TEST = false;

var TEST_SPECIAL_ADDRESSES_INTERFACE = false;

var TEST_DEVICE_DASHBOARD_COMMANDS = false;			// Passing 11/21/2017
var TEST_LOGGER_BASIC = true;

if(ENABLE_BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.basic_test;
}

if(ENABLE_SIMPLE_TEST) {
	var simple_test = require('./simple_test');
	exports.simple_test = simple_test.tests;
}
if(TEST_DRIVER_CONTROLLER) {
	var driver_controller_test = require('./driver_controller_test');
	exports.driver_controller_test = driver_controller_test.tests;
}

if(TEST_SINGLE_DEVICE_CONTROLLER) {
	var single_device_controller_test = require('./single_device_controller_test');
	exports.single_device_controller_test = single_device_controller_test.tests;
}
if(TEST_DEVICE_SCANNER) {
	var device_scanner_test = require('./device_scanning/device_scanner_test');
	exports.device_scanner_test = device_scanner_test.tests;
}
if(TEST_MOCK_DEVICE_SCANNER) {
	var mock_device_scanner_test = require('./device_scanning/mock_device_scanner_test');
	exports.mock_device_scanner_test = mock_device_scanner_test.tests;
}
if(TEST_LIVE_DEVICE_SCANNER) {
	var live_device_scanner_test = require('./device_scanning/live_device_scanner_test');
	exports.live_device_scanner_test = live_device_scanner_test.tests;
}
if(TEST_USB_ONLY_DEVICE_SCANNER) {
	var usb_only_device_scanner_test = require('./device_scanning/usb_only_device_scanner_test');
	exports.usb_only_device_scanner_test = usb_only_device_scanner_test.tests;
}

if(TEST_USB_ONLY_DEVICE_SCANNER_CACHING) {
	var usb_only_device_scanner_caching_test = require('./device_scanning/usb_only_device_scanner_caching_test');
	exports.usb_only_device_scanner_caching_test = usb_only_device_scanner_caching_test.tests;
}
if(TEST_DEVICE_CONTROLLER) {
	var device_controller_test = require('./device_controller_test');
	exports.device_controller_test = device_controller_test.tests;
}
if(TEST_DEVICE_CONTROLLER_OPEN_CLOSE) {
	var device_controller_open_close_test = require('./device_controller_open_close_test');
	exports.device_controller_open_close_test = device_controller_open_close_test.tests;
}
if(TEST_DEVICE_CONTROLLER_LIVE_DEVICE) {
	var device_controller_live_test = require('./device_controller_live_test');
	exports.device_controller_live_test = device_controller_live_test.tests;
}
if(TEST_DEVICE_CONTROLLER_OPEN_ADVANCED) {
	var device_controller_open_advanced_test = require('./device_controller/open_advanced_test');
	exports.device_controller_open_advanced_test = device_controller_open_advanced_test.tests;
}
if(TEST_DEVICE_KEEPER) {
	var device_keeper_test = require('./device_controller/device_keeper_test');
	exports.device_keeper_test = device_keeper_test.tests;
}

if(TEST_DEVICE_KEEPER_LIVE) {
	var device_keeper_live_test = require('./device_controller/device_keeper_live_test');
	exports.device_keeper_live_test = device_keeper_live_test.tests;
}
if(TEST_DEVICE_ERRORS) {
	var device_errors_test = require('./device_controller/device_errors_test');
	exports.device_errors_test = device_errors_test.tests;
}
if(TEST_UPDATE_MOCK_DEVICE) {
	var update_mock_device_test = require('./update_mock_device_test');
	exports.update_mock_device_test = update_mock_device_test.tests;
}

if(TEST_UPDATE_USB_DEVICE) {
	var update_usb_device_test = require('./update_usb_device_test');
	exports.update_usb_device_test = update_usb_device_test.tests;
}

if(MOCK_DEVICE_SPEED_TEST) {
	var mock_device_speed_test = require('./mock_device_speed_test');
	exports.mock_device_speed_test = mock_device_speed_test.tests;
}
if(T7_DEVICE_SPEED_TEST) {
	var t7_device_speed_test = require('./t7_device_speed_test');
	exports.t7_device_speed_test = t7_device_speed_test.tests;
}

if(TEST_SPECIAL_ADDRESSES_INTERFACE) {
	var ljm_special_addresses_test = require('./special_addresses/ljm_special_addresses_test');
	exports.ljm_special_addresses_test = ljm_special_addresses_test.tests;
}

if(TEST_DEVICE_DASHBOARD_COMMANDS) {
	var device_dashboard_commands_test = require('./dashboard/dashboard_test.js');
	exports.device_dashboard_commands_test = device_dashboard_commands_test.tests;
}

if(TEST_LOGGER_BASIC) {
	var simple_logger_basic_test = require('./simple_logger/simple_logger_basic_test.js');
	exports.simple_logger_basic_test = simple_logger_basic_test.tests;
}

*/


var fileNameBase = './';

function requireTest(groupName, fileNamePartials, isEnabled, destObj) {
	var filePath = '';
	var i;
	var testName = '';
	filePath += fileNameBase;
	if(groupName) {
		if(groupName !== '') {
			filePath += groupName + '/';
		}
	}

	testName += fileNamePartials[0];
	for(i = 1; i < fileNamePartials.length; i ++) {
		testName += '_' + fileNamePartials[i];
	}
	filePath += testName;

	if(isEnabled) {
		console.log(' - Requiring test file', filePath, groupName, testName);

		var basicGroupName = 'test';
		if(groupName) {
			if(groupName !== '') {
				basicGroupName = groupName;
			}
		}
		if(typeof(exports[basicGroupName]) === 'undefined') {
			exports[basicGroupName] = {};
		}
		exports[basicGroupName][testName] = require(filePath);
		// if(groupName !== '') {
		// 	exports[groupName] = require(filePath);
		// } else {
		// 	exports[testName] = require(filePath);
		// }
	} else {
		console.log(' - Skipping Test:', filePath);
	}
}

var groupKeys = Object.keys(testGroups);
groupKeys.forEach(function(groupKey) {
	var testGroup = testGroups[groupKey];

	// For each test group check to see if they are a test or loop through their
	// group contents.
	if(typeof(testGroup) === 'boolean') {
		requireTest('', [groupKey], testGroup, exports);
	} else {
		var testKeys = Object.keys(testGroup);
		testKeys.forEach(function(testKey) {
			// For each test in a group, require enabled tests.
			var test = testGroup[testKey];
			requireTest(groupKey, [testKey], exports);
		});
	}
});
