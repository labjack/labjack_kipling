var q = require('q');
var async = require('async');

var requiredDeviceList = [];

function configure(requiredDevices) {

}

function openDevices(test) {
	test.done();
}

function getDevices(test) {
	test.done();
}

function closeDevices(test) {
	test.done();
}


exports.configure = configure;
exports.openDevices = openDevices;
exports.getDevices = getDevices;
exports.closeDevices = closeDevices;