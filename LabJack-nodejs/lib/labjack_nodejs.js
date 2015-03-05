/**
 * Entry point for the rest of the module.
 *
 * @author Sam Pottinger (samnsparky, LabJack Corp.)
**/

// var device = require('./device');
// var driver = require('./driver');
// var driver_const = require('./driver_const');
var device;
var driver;
var modbusMap = require('ljswitchboard-modbus_map');
var driver_const = require('ljswitchboard-ljm_driver_constants');


exports.device = function() {
	if(device) {
		return new device.labjack();
	} else {
		device = require('./device');
		return new device.labjack();
	}
};
exports.driver = function() {
	if(driver) {
		return new driver.ljmDriver();
	} else {
		driver = require('./driver');
		return new driver.ljmDriver();
	}
};
exports.getDevice = function() {
	if(device) {
		return device.labjack;
	} else {
		device = require('./device');
		return device.labjack;
	}
};
exports.getDeviceRef = function() {
	if(device) {
		return device;
	} else {
		device = require('./device');
		return device;
	}
};
exports.getDriver = function() {
	if(driver) {
		return driver.ljmDriver();
	} else {
		driver = require('./driver');
		return driver.ljmDriver();
	}
};
// exports.driver_const = function() {
// 	driver_const = 
// 	return driver_const;
// };
// exports.modbusMap = function() {
// 	modbusMap = 
// 	return modbusMap;
// };
// exports.device = device.labjack;
// exports.driver = driver.ljmDriver;
exports.driver_const = driver_const;
exports.modbusMap = modbusMap;
