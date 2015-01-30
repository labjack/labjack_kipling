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
	device = require('./device');
	return new device.labjack();
};
exports.driver = function() {
	driver = require('./driver');
	return new driver.ljmDriver();
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
