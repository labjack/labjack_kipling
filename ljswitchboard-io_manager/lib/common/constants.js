
// Primary Interface
exports.io_manager_endpoint_key = "io_manager";
exports.driver_endpoint_key = "driver_manager";
exports.device_endpoint_key = "device_manager";
exports.logger_endpoint_key = "logger_manager";
exports.file_io_endpoint_key = "file_io_manager";

// Secondary Interface
exports.single_device_endpoint_key = "single_device_manager";

exports.DEVICE_CONTROLLER_DEVICE_OPENED = 'OPENED_DEVICE';
exports.DEVICE_CONTROLLER_DEVICE_CLOSED = 'CLOSED_DEVICE';


/* Events for the device controller */
var basicDeviceControllerEvents = {
	DEVICE_CONTROLLER_DEVICE_OPENED: 'OPENED_DEVICE',
	DEVICE_CONTROLLER_DEVICE_CLOSED: 'CLOSED_DEVICE',
};
var simpleLoggerEvents = require('ljswitchboard-simple_logger').eventList;
var loggerEventKeys = Object.keys(simpleLoggerEvents);
loggerEventKeys.forEach(function(key) {
	basicDeviceControllerEvents[key] = simpleLoggerEvents[key];
});
exports.deviceControllerEvents = basicDeviceControllerEvents;

// Commented out after integrating simple logger functions.
// exports.deviceControllerEvents = {
// 	DEVICE_CONTROLLER_DEVICE_OPENED: 'OPENED_DEVICE',
// 	DEVICE_CONTROLLER_DEVICE_CLOSED: 'CLOSED_DEVICE',
// };


/* Device Scanner Events */
var deviceScannerEvents = require('ljswitchboard-device_scanner').eventList;
var deviceScannerEventKeys = Object.keys(deviceScannerEvents);
deviceScannerEventKeys.forEach(function(key) {
	exports.deviceControllerEvents[key] = deviceScannerEvents[key];
});

// Define device errors
var ljm_driver_constants = require('ljswitchboard-ljm_driver_constants');
exports.deviceEvents = ljm_driver_constants.device_curator_constants;
