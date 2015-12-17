
var async = require('async');
var ljm_ffi = require('../lib/ljm-ffi');
var ljm = ljm_ffi.load();
var liblabjack = ljm_ffi.loadRaw();

var programOperations = [
	'open',
	'enable_log',
	// 'closeRaw',
	
	'testLogMessage',
	// 'open',
	
	// 'open',
	// 'closeAll',
	
	'eReadName',
	'eReadNames',
	'close',
	'disable_log',
];
var handle;
var ljmLogLevel = 9;
var functionCalls = {
	'enable_log': function() {
		// ljm.LJM_WriteLibraryConfigStringS('LJM_DEBUG_LOG_FILE', 'C:\\Users\\chris\\Documents\\logFile.txt');
		liblabjack.LJM_WriteLibraryConfigStringS('LJM_DEBUG_LOG_LEVEL', 'LJM_TRACE');
		liblabjack.LJM_WriteLibraryConfigStringS('LJM_DEBUG_LOG_MODE', 'LJM_DEBUG_LOG_MODE_ON_ERROR');
		liblabjack.LJM_WriteLibraryConfigS('LJM_DEBUG_LOG_FILE_MAX_SIZE', 9999999);
	},
	'disable_log': function() {
		liblabjack.LJM_Log(ljmLogLevel, 'Disabling Log');
		liblabjack.LJM_WriteLibraryConfigStringS('LJM_DEBUG_LOG_LEVEL', 'LJM_FATAL');
		liblabjack.LJM_WriteLibraryConfigStringS('LJM_DEBUG_LOG_MODE', 'LJM_DEBUG_LOG_MODE_NEVER');
		liblabjack.LJM_WriteLibraryConfigS('LJM_DEBUG_LOG_FILE_MAX_SIZE', 9999999);
	},
	'testLogMessage': function() {
		console.log('Log Message Result Raw', liblabjack.LJM_Log(ljmLogLevel, 'Test Message Raw'));
		console.log('Log Message Result Std', ljm.LJM_Log(ljmLogLevel, 'Test Message'));
	},
	'open': function() {
		console.log('Log Message Result Raw', liblabjack.LJM_Log(ljmLogLevel, 'Opening Device Raw'));
		console.log('Log Message Result Std', ljm.LJM_Log(ljmLogLevel, 'Opening Device'));
		var retData = ljm.LJM_OpenS('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY', 0);
		console.log('OpenS', retData);
		handle = retData.handle;
	},
	'eReadName': function() {
		var register = 'AIN0';
		ljm.LJM_Log(ljmLogLevel, 'Reading Data');
		var retData = ljm.LJM_eReadName(handle, register, 0);
		console.log('eReadName', retData);
	},
	'eReadNames': function() {
		var registers = ['AIN0', 'AIN1'];
		var retData = ljm.LJM_eReadNames(
			handle,
			registers.length,
			registers,
			[0,0],
			0
		);
		console.log('eReadNames', retData);
		console.log('Analog Reads', retData.aValues);
	},
	'closeRaw': function() {
		ljm.LJM_Log(ljmLogLevel, 'Closing Device Raw');
		var retData = liblabjack.LJM_Close(handle);
		console.log('CloseRaw', retData);
	},
	'close': function() {
		ljm.LJM_Log(ljmLogLevel, 'Closing Device');
		var retData = ljm.LJM_Close(handle);
		console.log('Close', retData);
	},
	'closeAll': function() {
		ljm.LJM_Log(ljmLogLevel, 'Closing All Devices');
		ljm.LJM_CloseAll();
	}
};

try {
	async.eachSeries(programOperations,
		function(operationName, cb) {
			console.log('Executing:', operationName);
			functionCalls[operationName]();
			setTimeout(cb, 500);
		}, function(err) {
			console.log('Finished');
		});
} catch(err) {
	console.log('ERROR', err, err.stack);
}