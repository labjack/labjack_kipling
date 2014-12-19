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
var driver_const;



exports.device = function() {
	device = require('./device');
	return new device.labjack();
};
exports.driver = function() {
	driver = require('./driver');
	return driver.ljmDriver();
};
exports.driver_const = function() {
	driver_const = require('./driver_const');
	return driver_const;
};
// exports.device = device.labjack;
// exports.driver = driver.ljmDriver;
// exports.driver_const = driver_const;
