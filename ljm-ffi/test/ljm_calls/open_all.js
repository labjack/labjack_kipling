
// Define functions to assist with handling various C data types.
var type_helpers = require('../../lib/type_helpers');
var ljTypeMap = type_helpers.ljTypeMap;
var ljTypeOps = type_helpers.ljTypeOps;
var convertToFFIType = type_helpers.convertToFFIType;

var driver_const = require('ljswitchboard-ljm_driver_constants');
var ARCH_CHAR_NUM_BYTES = 1;
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

var ENABLE_DEBUG = false;
function debug() {
	if(ENABLE_DEBUG) {
		console.log.apply(console, arguments);
	}
}
var ENABLE_LOG = true;
function log() {
	if(ENABLE_LOG) {
		console.log.apply(console, arguments);
	}
}


/* Define how the tests will be run. */
var ljm;
var liblabjack;
var ffi_liblabjack;

var test_utils;
var parseIPAddress;
var getHandleInfos;
var getDeviceInfos;

/* Define Test Cases */
var test_cases = {
	'include ljm': function(test) {
		var ljm_ffi = require('../../lib/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		// Require testing utilities.
		test_utils = require('../test_utils/test_utils');
		parseIPAddress = test_utils.parseIPAddress;
		getHandleInfos = test_utils.getHandleInfos;
		getDeviceInfos = test_utils.getDeviceInfos;

		test.done();
	},
	'Executing OpenAll function': function(test) {
		var cachedOpenAllData = {};

		function handleGetHandleInfos(data) {
			log('  - Opened Devices'.green, data);

			// Release the open all data info handle
			ljm.LJM_CleanInfo(cachedOpenAllData.InfoHandle);
			test.done();
		}

		function handleOpenAll(openAllData) {
			cachedOpenAllData = openAllData;
			var keysToIgnore = ['aHandles'];
			var specialKeys = ['Info'];
			var specialKeyHandlers = {
				'Info': function(info) {
					var data = {};
					try {
						data = JSON.parse(info);
					} catch(err) {
						console.error('Error parsing info string', err, info);
					}
					return JSON.stringify(data);
				}
			};
			var printData = {};
			var keys = Object.keys(openAllData);
			keys.forEach(function(key) {
				if(specialKeys.indexOf(key) >= 0) {
					printData[key] = specialKeyHandlers[key](openAllData[key]);
				} else if(keysToIgnore.indexOf(key) < 0) {
					printData[key] = openAllData[key];
				}
			});
			debug('in handleOpenAll', printData);

			var deviceHandles = [];
			openAllData.aHandles.forEach(function(handle) {
				if(handle !== 0) {
					deviceHandles.push(handle);
				}
			});

			getDeviceInfos(deviceHandles, handleGetHandleInfos);
		}

		var dts = 'LJM_dtT7'; 
		var dt = driver_const.deviceTypes[dts];
		var cts = 'LJM_ctUSB';
		var ct = driver_const.connectionTypes[cts];
		var numOpened = 0;
		var aHandles = [];
		for(var i = 0; i < 128; i++) {
			aHandles.push(0);
		}
		var numErrors = 0;
		var infoHandle = 0;
		var info = '';

		ljm.Internal_LJM_OpenAll.async(
			dt,
			ct,
			numOpened,
			aHandles,
			numErrors,
			infoHandle,
			info,
			handleOpenAll
		);
	},
};


exports.tests = test_cases;