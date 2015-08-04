var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var ljm = require('labjack-nodejs');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var driver = ljm.driver();
var data_parser = require('ljswitchboard-data_parser');
var curatedDevice = require('ljswitchboard-ljm_device_curator');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();


// Utilities to load and verify logger config files.
var config_loader = require('./config_loader');
var config_checker = require('./config_checker');

// Code that collects data from devices.
var data_collector = require('./data_collector');

// Code that logs data to files.
var data_logger = require('./data_logger');

// Code that collects & reports data to listeners.
var data_reporter = require('./data_reporter');