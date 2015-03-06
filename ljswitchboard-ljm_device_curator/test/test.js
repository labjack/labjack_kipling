

/********************** Require tests *****************************************/
// Require generic tests on mock devices
var mock_device_test = require('./mock_device_test');
var mock_device_defaults_cache_test = require('./mock_device_defaults_cache_test');
var mock_device_attrs_test = require('./mock_device_attrs_test');

// Require T7 related tests
var t7_basic_test = require('./t7_basic_test');
var t7_check_calibration_test = require('./t7_check_calibration_test');
var t7_read_recovery_fw_version_test = require('./t7_read_recovery_fw_version_test');
var t7_upgrade_test = require('./t7_upgrade_test');
var t7_error_test = require('./t7_error_test');
var t7_open_close_test = require('./t7_open_close_test');
var t7_basic_stream_test = require('./t7_basic_stream_test');
var t7_single_channel_speed_test = require('./t7_single_channel_speed_test');

// Raw test of some labjack-nodejs stuff
var t7_raw_test = require('./t7_raw_test');

// Thermocouple Tests
var t7_thermocouple_speed_test = require('./t7_thermocouple_speed_test');

// Require Digit related tests
var digit_basic_test = require('./digit_basic_test');


/********************** Perform tests *****************************************/
// Perform Generic tests on mock devices
// exports.mock_device_test = mock_device_test.tests;								// Passing
// exports.mock_device_defaults_cache_test = mock_device_defaults_cache_test.tests;// Passing
// exports.mock_device_attrs_test = mock_device_attrs_test.tests;

// Perform T7 related tests
// exports.t7_basic_test = t7_basic_test.tests;									// Passing
// exports.t7_check_calibration_test = t7_check_calibration_test.tests;			// Passing
// exports.t7_read_recovery_fw_version_test = t7_read_recovery_fw_version_test.tests;
// exports.t7_upgrade_test = t7_upgrade_test.tests;								// Passing
// exports.t7_error_test = t7_error_test.tests;									// Passing
// exports.t7_open_close_test = t7_open_close_test.tests;						// Passing
// exports.t7_basic_stream_test = t7_basic_stream_test.tests;						// Passing
// exports.t7_single_channel_speed_test = t7_single_channel_speed_test.tests;		// Passing
// exports.t7_single_channel_speed_testA = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testB = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testC = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testD = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testE = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testF = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testG = t7_single_channel_speed_test.tests;

// Raw tests
// exports.t7_raw_test = t7_raw_test.tests;

// Thermocouple Tests
exports.t7_thermocouple_speed_test = t7_thermocouple_speed_test.tests;

// Perform Digit related tests
// exports.digit_basic_test = digit_basic_test.tests;