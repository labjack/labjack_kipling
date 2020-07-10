

var async = require('async');


var device_curator = require('@labjack/ljswitchboard-ljm_device_curator');
var ljm_ffi = require('@labjack/ljm-ffi');
var ljm = ljm_ffi.load();
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`);
  console.log('Stack', err.stack);
  ljm.LJM_CloseAll();
  process.exit();
});
process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});
/*
 * This is a script that performs a scan for devices so that you can see what LabJack devices
 * are currently available.
*/
var deviceScanner = require('../lib/ljswitchboard-device_scanner')
	.getDeviceScanner('open_all_device_scanner');


var foundDevices = {};

// This is an array of curated devices produced by the ljswitchboard-ljm_device_curator module.
var connectedDevices = [];
var device;

function connectToLJDevice(callback) {
	console.log('Connecting to a LJ Device');
	device = new device_curator.device();
	device.open('LJM_dtT7','LJM_ctUSB', 'LJM_idANY')
	.then(function(dev) {
		console.log('Opened a T7', device.savedAttributes.serialNumber);
		connectedDevices.push(device);
		callback();
	}, function(err) {
		console.log('Failed to open a T7');
		callback();
	});
}

function closeLJDevice(callback) {
	device.close()
	.then(function(dev) {
		console.log('Closed a T7');
		callback();
	}, function(err) {
		console.log('Failed to close a T7');
		callback();
	});
}

function performOpenAllScan(callback) {
	// Perform Scan
	console.log('Performing Scan with OpenAll');
	deviceScanner.findAllDevices(connectedDevices)
	.then(function(deviceTypes) {
		console.log('Finished Scanning with OpenAll');
		// console.log('Scan Results');
		// console.log(JSON.stringify(deviceTypes, null, 2));
		callback();
	}, function(err) {
		console.log('Scanning Error', err);
		callback();
	});
}

function closeAllDevices(callback) {
	ljm.LJM_CloseAll();
	callback();
}

var operations = [
	connectToLJDevice,
	performOpenAllScan,
	closeLJDevice,
	closeAllDevices,
];

async.eachSeries(operations,
	function executor(func, cb) {
		if(typeof(func) === 'function') {
			func(cb);
		} else {
			console.log('Operation is not a function...');
			cb();
		}
	},
	function finishedExecuting() {
		console.log('Finished Executing...');
	});
