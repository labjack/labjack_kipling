
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});


var cwd = process.cwd();

var path = require('path');
var fs = require('fs');
var q = require('q');
console.log('Requiring io_manager');
var io_manager = require('../');
var io_interface = io_manager.io_interface();
var driverController;
var deviceController;
global.io_manager = io_manager;
global.io_interface = io_interface;

console.log('io_interface:', Object.keys(io_interface));

// var readline = require('readline');
// var rl = readline.createInterface(process.stdin, process.stdout);
// rl.setPrompt('> ');


function cmdApp() {
	console.log('Welcome to the io_manager cmd console app');

	function startSubProcess() {
		function handleSubProcessInit(data) {
			// console.log('In handleSubProcessInit:', data);
			console.log('Started sub-process');
			defered.resolve();
		}
		function handleSubProcessErr(data) {
			console.log('In handleSubProcessErr:', data);
			defered.resolve();
		}
		var defered = q.defer();

		io_interface.initialize()
		.then(handleSubProcessInit)
		.catch(handleSubProcessErr);

		return defered.promise;
	}
	function getAndSaveDeviceAndDriverObjects() {
		var defered = q.defer();

		try {
			driverController = io_interface.getDriverController();
			deviceController = io_interface.getDeviceController();

			// Expose the driver and device controllers.
			replServer.context.driverController = driverController;
			replServer.context.deviceController = deviceController;
			defered.resolve();
		} catch(err) {
			console.log('Error encountered getting dev and drvr objects.', err);
			defered.resolve();
		}

		
		return defered.promise;
	}

	var enableMockScanning = false;
	function enableMockDeviceScanning() {
		var defered = q.defer();

		if(enableMockScanning) {
			console.log('Warning!! Mock Scanning is Enabled');
			deviceController.enableMockDeviceScanning()
			.then(defered.resolve, defered.reject);
		} else {
			defered.resolve();
		}
		return defered.promise;
	}
	function addMockDevices() {
		var defered = q.defer();
		if(enableMockScanning) {
			deviceController.addMockDevices([
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctETHERNET',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB'
			}
		])
			.then(defered.resolve, defered.reject);
		} else {
			defered.resolve();
		}
		return defered.promise;
	}

	this.initialScanData = undefined;
	this.deviceFound = false;
	this.firstFoundDevices = {};
	this.firstFoundDevice = undefined;
	function performInitialDeviceScan() {
		function handleScanSuccess(data) {
			// console.log('In handleScanSuccess:', data);
			console.log('Performed Initial Scan', data);
			self.initialScanData = data;
			if(data.length > 0) {
				self.deviceFound = true;
				data.forEach(function(deviceType) {
					var dtName = deviceType.deviceTypeName;
					var isFoundYet = false;
					if(typeof(self.firstFoundDevices[dtName]) !== 'undefined') {
						isFoundYet = true;
					}
					if(!isFoundYet) {
						self.firstFoundDevices[dtName] = deviceType.devices[0];
					}

					if(typeof(self.firstFoundDevice) === 'undefined') {
						self.firstFoundDevice = deviceType.devices[0];
					}
				});
			}
			defered.resolve();
		}
		function handleScanError(data) {
			console.log('In handleScanError:', data);
			defered.resolve();
		}
		var defered = q.defer();

		deviceController.listAllDevices()
		.then(handleScanSuccess)
		.catch(handleScanError);

		return defered.promise;
	}

	function openFirstFoundDevice() {
		var defered = q.defer();
		function openSuccess(data) {
			console.log('Opened Device Attributes', Object.keys(data));
			// console.log('In openSuccess');
			replServer.context.device = data;
			defered.resolve();
		}
		function openError(data) {
			console.log('In openError', data);
			defered.resolve();
		}
		var openParameters = {};
		if(self.deviceFound) {
			openParameters = {
				'deviceType': self.firstFoundDevice.dt,
				'connectionType': self.firstFoundDevice.ct,
				'identifier': self.firstFoundDevice.serialNumber,
			};
			deviceController.openDevice(openParameters)
			.then(openSuccess, openError);
		} else {
			openParameters = {
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'identifier': '470010111',
				'mockDevice': true,
			};
			deviceController.openDevice(openParameters)
			.then(openSuccess, openError);
		}
		return defered.promise;
	}
	this.start = function() {
		return startSubProcess()
		.then(getAndSaveDeviceAndDriverObjects)
		.then(enableMockDeviceScanning)
		.then(addMockDevices)
		.then(performInitialDeviceScan)
		.then(openFirstFoundDevice);
	};

	var self = this;
}
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
var my_app = new cmdApp();
global.my_app = my_app;
// rl.on('line', my_app.newLine)
// .on('close', function closeApplication() {
//   console.log('Have a great day!');
//   process.exit(0);
// }).prompt();

var repl = require('repl');

/* Stuff for the device manager */
// var ljm_device_manager = require('ljswitchboard-ljm_device_manager');
// var deviceManager = ljm_device_manager.load();

// var otherCLIConsoles = [];
// function getDMEventListener(eventName) {
// 	return function dmEventListener(eventInfo) {
// 		console.log('dmEventListener', eventName, eventInfo);
// 		otherCLIConsoles.forEach(function(cliConsole) {
// 			cliConsole.log('dmEventListener', eventName, eventInfo);
// 		});
// 	};
// }
// var dmEvents = ljm_device_manager.eventList;
// var dmEventKeys = Object.keys(dmEvents);
// dmEventKeys.forEach(function(eventKey) {
// 	var eventName = dmEvents[eventKey];
// 	deviceManager.on(eventName, getDMEventListener(eventName));
// });

// global.ljm_device_manager = ljm_device_manager;
// global.deviceManager = deviceManager;
/* End Stuff for the device manager */

var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var Device = require('ljswitchboard-ljm_device_curator').device;

var modbus_map = require('ljswitchboard-modbus_map').getConstants();

global.ljm = ljm;
// global.Device = Device;
// var d = new Device();
// global.d = d;
global.pr = pr;
global.pe = pe;

global.modbus_map = {
	'getErrorInfo': modbus_map.getErrorInfo,
	'getAddressInfo': modbus_map.getAddressInfo,
	'isArrayRegister': modbus_map.isArrayRegister,
};

function handleReplExit(exitData) {
	console.log('Repl Exiting...');
	try {
		io_interface.destroy()
		.then(function() {
			console.log('Destroyed sub-process');
			process.exit();
		});
	} catch(err) {
		console.log('Error Exiting...', err);
		process.exit();
	}
	// deviceManager.closeAll()
	// .then(function() {
	// 	console.log('Finished Closing Devices');
	// 	process.exit();
	// });
}

function handleReplReset(context) {
	console.log('Repl reset...');
}

var replServer;
function startRepl() {
	/* 
	 * A npm library that could be used instead of doing this manually is:
	 * https://github.com/dshaw/replify
	 */
	var defered = q.defer();

	console.log('Starting REPL');
	// Start the repl.
	replServer = repl.start({
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

startRepl()
.then(my_app.start);
