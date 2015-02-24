

var device_scanner;
exports.getDeviceScanner = function() {
	if(device_scanner) {
	} else {
		device_scanner = require('./device_scanner');
	}
	return device_scanner;
};

exports.eventList = require('./event_list');