
/*
 * This is a simple CMD line application using node's repl that
 * allows users to interact with a LabJack device.
 */
var repl = require('repl');
var q = require('q');
var async = require('async');

process.on('unhandledRejection', function(reason, p) {
	console.log('In unhandledRejection', reason);
});
process.on('uncaughtException', function(err) {
	console.log('in uncaughtException', err, err.stack);
});

function pr() {
	console.log('Executing pr');
	console.log.apply(console, arguments);
}
function pe() {
	console.log('Executing pe');
	console.log.apply(console, arguments);
}

var ljm_device_manager = require('../lib/ljm_device_manager');
var deviceManager = ljm_device_manager.load();

function getDMEventListener(eventName) {
	return function dmEventListener(eventInfo) {
		console.log('dmEventListener', eventName, eventInfo);
	};
}
var dmEvents = ljm_device_manager.eventList;
var dmEventKeys = Object.keys(dmEvents);
dmEventKeys.forEach(function(eventKey) {
	var eventName = dmEvents[eventKey];
	deviceManager.on(eventName, getDMEventListener(eventName));
});

global.ljm_device_manager = ljm_device_manager;
global.deviceManager = deviceManager;
global.pr = pr;
global.pe = pe;




function handleReplExit(exitData) {
	console.log('Repl Exiting...');
	deviceManager.closeAll()
	.then(function() {
		console.log('Finished Closing Devices');
		process.exit();
	});
}

function handleReplReset(context) {
	console.log('Repl reset...');
}

function startRepl() {
	var defered = q.defer();

	console.log('Starting REPL');
	// Start the repl.
	var replServer = repl.start({
		terminal: true,
		'useColors': true,
		prompt: '> ',
		replMode:repl.REPL_MODE_MAGIC,
	});
	replServer.displayPrompt();
	replServer.on('exit', handleReplExit);
	replServer.on('reset', handleReplReset);

	defered.resolve();
	return defered.promise;
}

var openedDeviceInfo;
function openDevice() {
	var defered = q.defer();

	deviceManager.open()
	.then(function(deviceInfo) {
		openedDeviceInfo = {
			'dt': deviceInfo.savedAttributes.productType,
			'ct': deviceInfo.savedAttributes.connectionTypeName,
			'sn': deviceInfo.savedAttributes.serialNumber,
			'ljmHandle': deviceInfo.savedAttributes.handle,
		};
		console.log('Opened Device!', {
			'dt': deviceInfo.savedAttributes.productType,
			'ct': deviceInfo.savedAttributes.connectionTypeName,
			'sn': deviceInfo.savedAttributes.serialNumber,
			'ljmHandle': deviceInfo.savedAttributes.handle,
		});
		defered.resolve();
	})
	.catch(function(err) {
		console.log('Did not open device', err);
		defered.resolve();
	});

	return defered.promise;
}

function closeDevice() {
	var defered = q.defer();

	console.log('Closing Device');
	deviceManager.close(openedDeviceInfo)
	.then(function(closeInfo) {
		console.log('Device closed!', closeInfo);
		defered.resolve();
	})
	.catch(function(err) {
		console.log('Did not close device', err);
		defered.resolve();
	});

	return defered.promise;
}
var startupCMDS = [
	openDevice,
	closeDevice,
	openDevice,
	// startRepl,
];


async.eachSeries(
	startupCMDS,
	function(startupCMD, cb) {
		startupCMD()
		.then(cb)
		.catch(function(err) {
			console.log('Error Executing cmd', err);
			cb(err);
		});
	},
	function(err) {
		if(err) {
			// console.log('Error Executing.... FF', err);
		} else {
			// console.log('Finished Executing!');	
		}
		startRepl();
	});