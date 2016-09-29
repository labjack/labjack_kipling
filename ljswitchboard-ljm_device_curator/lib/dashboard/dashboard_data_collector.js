
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();



function t4DataCollector(device) {
	var firstRead = ['DIO_ANALOG_ENABLE'];

	// Conditionally read AIN#(0:11)
	var defered = q.defer();

	var secondRead = ['AIN#(0:11)', 'DAC#(0:1)', 'DIO_STATE', 'DIO_DIRECTION'];
	var data = {
		'testData': 'test',
	};
	defered.resolve(data);
	return defered.promise;
}
function t5DataCollector(device) {
	var defered = q.defer();

	var dataToRead = ['AIN#(0:7)', 'DAC#(0:1)', 'DIO_STATE', 'DIO_DIRECTION'];
	var data = {
		'testData': 'test',
	};
	defered.resolve(data);
	return defered.promise;
}
function t7DataCollector(device) {
	var defered = q.defer();

	var dataToRead = ['AIN#(0:13)', 'DAC#(0:1)', 'DIO_STATE', 'DIO_DIRECTION'];
	var data = {
		'testData': 'test',
	};
	defered.resolve(data);
	return defered.promise;
}

var dataCollectors = {
	'T4': t4DataCollector,
	'T5': t5DataCollector,
	'T7': t7DataCollector,
};

function createDashboardDataCollector(deviceType) {
	console.log('Creating a dashboard data collector object for:', deviceType);
	var dataCollector = dataCollectors[deviceType];

	this.daqInterval = 1000;
	this.isRunning = false;
	this.intervalHandler = undefined;
	this.isCollecting = false;

	this.collectionManager = function(device) {
		if(self.isCollecting) {
			console.log('dashboard_data_collector is already collecting');
			return false;
		} else {
			self.isCollecting = true;
			dataCollector(device)
			.then(function(res) {
				console.log('dashboard_data_collector collected data - success', res);
				self.emit('data', res);
				// We have data
				self.isCollecting = false;
			}, function(err) {
				console.log('dashboard_data_collector collected data - error');
				// We have problems...
				self.isCollecting = false;
			});
		}
	};

	this.start = function(curatedDevice) {
		var started = false;
		if(self.isRunning){
			return started;
		} else {
			started = true;
			self.isRunning = true;
			// setInterval args: callback, interval, args...
			self.intervalHandler = setInterval(self.collectionManager, self.daqInterval, curatedDevice);
			return started;
		}
	};

	this.stop = function() {
		var stopped = false;
		if(self.isRunning) {
			clearInterval(self.intervalHandler);
			self.isRunning = false;
			stopped = true;
		}
		return stopped;
	};

	var self = this;
}

util.inherits(createDashboardDataCollector, EventEmitter);

module.exports.create = createDashboardDataCollector;