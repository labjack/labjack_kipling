
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();

var DEBUG_FILE_SYSTEM_OPERATIONS = false;
var DEBUG_FILE_SYSTEM_GET_CWD = false;
var DEBUG_FILE_SYSTEM_GET_LS = false;
var ENABLE_ERROR_OUTPUT = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugFSOps = getLogger(DEBUG_FILE_SYSTEM_OPERATIONS);
var debugCWD = getLogger(DEBUG_FILE_SYSTEM_GET_CWD);
var debugLS = getLogger(DEBUG_FILE_SYSTEM_GET_LS);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

/*
 * Most of the documentation on this feature of the T7
 * is available on the webpage:
 * https://labjack.com/support/datasheets/t7/sd-card
*/
function getFileSystemOperations(self) {
	var operationToRegisterNames = {
		'pwd': 'FILE_IO_DIR_CURRENT',
	};

	function createExecuteFileIOCMDBundle(operation) {
		var bundle ={
			'opRegister': operationToRegisterNames[operation],
			'dataLenReg': 'FILE_IO_NAME_READ_LEN',
			'dataReg': 'FILE_IO_NAME_READ',
		};
	}
	// function 
	// function executeFilIOCMD (operation){
	// 	var defered = q.defer();
	// 	var opReg = operationToRegisterNames[operation];

	// 	self.iWrite(opReg, 1)
	// 	.then(function(res) {
	// 		self.readArray('FILE_IO_NAME_READ')
	// 		.then(function(res) {

	// 		});
	// 	}, function(err) {
	// 		defered.reject();
	// 	});
	// 	return defered.promise;
	// }

	/*
	 * getCWD helper functions.
	 */
	function createGetCWDBundle(operation) {
		debugCWD('in createGetCWDBundle');
		var bundle ={
			'opRegister': operationToRegisterNames[operation],
			'dataLenReg': 'FILE_IO_NAME_READ_LEN',
			'dataReg': 'FILE_IO_NAME_READ',
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
		return bundle;
	}
	function startGetCWDOperation(bundle) {
		debugCWD('in startGetCWDOperation');
		var defered = q.defer();
		self.iWrite('FILE_IO_DIR_CURRENT', 1)
		.then(function(res) {
			debugCWD('in startGetCWDOperation res', res);
			defered.resolve(bundle);
		}, function(err) {
			debugCWD('in startGetCWDOperation err', err);
			bundle.isError = true;
			bundle.errorStep = 'startGetCWDOperation';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function getFileIONameReadLen(bundle) {
		debugCWD('in getFileIONameReadLen');
		var defered = q.defer();
		self.iRead('FILE_IO_NAME_READ_LEN')
		.then(function(res) {
			debugCWD('in getFileIONameReadLen res', res);
			bundle.FILE_IO_NAME_READ_LEN = res.val;
			defered.resolve(bundle);
		}, function(err) {
			debugCWD('in getFileIONameReadLen err', err);
			bundle.isError = true;
			bundle.errorStep = 'getFileIONameReadLen';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function getFileIONameRead(bundle) {
		debugCWD('in getFileIONameRead');
		var defered = q.defer();
		self.readArray('FILE_IO_NAME_READ', bundle.FILE_IO_NAME_READ_LEN)
		.then(function(cwdChars) {
			var str = '';
			cwdChars.forEach(function(cwdChar) {
				if(cwdChar !== 0) {
					str += String.fromCharCode(cwdChar);
				}
			});
			bundle.FILE_IO_NAME_READ = str;
			debugCWD('in getFileIONameRead', str);
			defered.resolve(bundle);
		}, function(err) {
			debugCWD('in getFileIONameRead err', err);
			bundle.isError = true;
			bundle.errorStep = 'getFileIONameReadLen';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	/*
	 * Instructions as per website:
	 * 1. Write a value of 1 to FILE_IO_DIR_CURRENT. The error 
	 *  returned indicates whether there is a directory loaded as 
	 *  current. No error (0) indicates a valid directory.
	 * 2. Read  FILE_IO_NAME_READ_LEN.
	 * 3. Read an array of size FILE_IO_NAME_READ_LEN from 
	 *  FILE_IO_NAME_READ.
	 * 4. Resultant string will be something like "/" for 
	 * the root directory, or "/DIR1/DIR2" for a directory.
	*/
	this.getCWD = function() {
		debugFSOps('* in getCWD');
		var defered = q.defer();
		var bundle = createGetCWDBundle();
		
		function succFunc(rBundle) {
			debugCWD('in getCWD res');
			defered.resolve({
				'cwd': rBundle.FILE_IO_NAME_READ,
				// 'res': rBundle.FILE_IO_NAME_READ,
				// 'val': rBundle.FILE_IO_NAME_READ,
			});
		}
		function errFunc(rBundle) {
			debugCWD('in getCWD err', rBundle);
			defered.reject(rBundle);
		}

		startGetCWDOperation(bundle)
		.then(getFileIONameReadLen)
		.then(getFileIONameRead)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	/*
	 * Helper functions for readdir
	 */
	function createReaddirBundle() {
		return {
			'fileNames': [],
			'files': [],
		};
	}
	// Step #1 in Readdir Operation
	function startReaddirOperation(bundle) {
		debugLS('in startReaddirOperation');
		var defered = q.defer();
		self.iWrite('FILE_IO_DIR_FIRST', 1)
		.then(function(res) {
			debugLS('in startReaddirOperation res', res);
			defered.resolve(bundle);
		}, function(err) {
			debugLS('in startReaddirOperation err', err);
			bundle.isError = true;
			bundle.errorStep = 'startReaddirOperation';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	// Step #2 in Readdir Operation
	function getReaddirAttributes(bundle) {
		debugLS('in getReaddirAttributes');
		var defered = q.defer();
		self.iReadMultiple([
			'FILE_IO_NAME_READ_LEN',
			'FILE_IO_ATTRIBUTES',
			'FILE_IO_SIZE',
		])
		.then(function(results) {
			debugLS('in getReaddirAttributes res', results);
			results.forEach(function(result) {
				if(!result.isErr) {
					bundle[result.data.name] = result.data;
				}
			});
			// console.log("HERE!@'");
			// bundle.FILE_IO_NAME_READ_LEN = 0;
			defered.resolve(bundle);
		}, function(err) {
			debugLS('in getReaddirAttributes err', err);
			bundle.isError = true;
			bundle.errorStep = 'getReaddirAttributes';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	// Step #3 in Readdir Operation
	function readAndSaveFileListing(bundle) {
		debugLS('in readAndSaveFileListing');
		var defered = q.defer();
		self.readArray('FILE_IO_NAME_READ', bundle.FILE_IO_NAME_READ_LEN.val)
		.then(function(cwdChars) {
			debugLS('in readAndSaveFileListing raw', cwdChars);
			var str = '';
			cwdChars.forEach(function(cwdChar) {
				if(cwdChar !== 0) {
					str += String.fromCharCode(cwdChar);
				}
			});
			// Save the file name.
			bundle.fileNames.push(str);

			var fileInfo = {
				'name': str,
				'isDirectory': bundle.FILE_IO_ATTRIBUTES.isDirectory,
				'isFile': bundle.FILE_IO_ATTRIBUTES.isFile,
				'size': bundle.FILE_IO_SIZE.val,
				'sizeStr': bundle.FILE_IO_SIZE.str,
			};
			// Save the file's info.
			bundle.files.push(fileInfo);
			
			debugLS('in readAndSaveFileListing fileInfo', fileInfo);
			defered.resolve(bundle);
		}, function(err) {
			debugLS('in readAndSaveFileListing err', err);
			bundle.isError = true;
			bundle.errorStep = 'readAndSaveFileListing';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	
	var LJM_ERR_FILE_IO_NOT_FOUND = 2960;
	var LJM_ERR_FILE_IO_INVALID_OBJECT = 2809;
	var acceptableCheckForMoreFilesErrCodes = [
		LJM_ERR_FILE_IO_NOT_FOUND,
		LJM_ERR_FILE_IO_INVALID_OBJECT
	];
	// Step #4 in Readdir Operation
	function checkForMoreFiles(bundle) {
		debugLS('in checkForMoreFiles');
		var defered = q.defer();

		self.iWrite('FILE_IO_DIR_NEXT', 1)
		.then(function(res) {
			debugLS('in checkForMoreFiles res');
			// If there wasn't an error then there are more files that need
			// to be read.
			// startReaddirOperation(bundle)
			getReaddirAttributes(bundle)
			.then(getFileIONameRead)
			.then(defered.resolve)
			.catch(defered.reject);
		}, function(err) {
			if(acceptableCheckForMoreFilesErrCodes.indexOf(err) >= 0) {
			// if(err == 2960) {
				debugLS('in checkForMoreFiles Finished!');
				// Then there are no more items... done.
				defered.resolve(bundle);
			} else {
				// There was some weird issue...
				debugLS('in checkForMoreFiles err', err);
				bundle.isError = true;
				bundle.errorStep = 'checkForMoreFiles';
				bundle.error = modbusMap.getErrorInfo(err);
				bundle.errorCode = err;
				defered.reject(bundle);
			}
		});
		return defered.promise;
	}

	this.readdir = function(path) {
		/*
		 * Get list of items in the CWD
		 * 1. Write a value of 1 to FILE_IO_DIR_FIRST. 
		 *  The error returned indicates whether 
		 *  anything was found. No error (0) indicates 
		 *  that something was found. FILE_IO_NOT_FOUND 
		 *  (2960) indicates that nothing was found.
		 * 2. Read FILE_IO_NAME_READ_LEN, 
		 *  FILE_IO_ATTRIBUTES, and FILE_IO_SIZE. 
		 *  Store the attributes and size associated 
		 *  with each file.
		 * 3. Read an array from FILE_IO_NAME_READ of 
		 *  size FILE_IO_NAME_READ_LEN. This is the 
		 *  name of the file/folder.
		 * 4. Write a value of 1 to FILE_IO_DIR_NEXT. 
		 *  The error returned indicates whether anything 
		 *  was found. No error (0) indicates that there 
		 *  are more items->go back to step 2. 
		 *  FILE_IO_NOT_FOUND (2960) indicates that there 
		 *  are no more items->Done.
		 */
		debugFSOps('* in readdir');
		var defered = q.defer();
		var bundle = createReaddirBundle();

		function succFunc(rBundle) {
			debugLS('in readdir res');
			defered.resolve({
				'fileNames': rBundle.fileNames,
				'files': rBundle.files,
			});
		}
		function errFunc(rBundle) {
			debugLS('in readdir err', rBundle);
			defered.reject(rBundle);
		}

		startReaddirOperation(bundle)
		.then(getReaddirAttributes)
		.then(readAndSaveFileListing)
		.then(checkForMoreFiles)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	this.changeDirectory = function(directory) {
		/*
		 * Change the CWD:
		 * 1. Find from the list of items a directory 
		 *  to open, e.g. "/DIR1".  Directories can be 
		 *  parsed out of the list of items by analyzing 
		 *  their FILE_IO_ATTRIBUTES bitmask.  If bit 4 
		 *  of the FILE_IO_ATTRIBUTES bitmask is set, then 
		 *  the item is a directory. 
		 * 2. Write the directory name length in bytes 
		 *  to FILE_IO_NAME_WRITE_LEN (ASCII, so each char 
		 *  is 1 byte, also don't forget to add 1 for the 
		 *  null terminator).
		 * 3. Write the directory string (converted to an 
		 *  array of bytes, with null terminator) to 
		 *  FILE_IO_NAME_WRITE.  (array size = length from 
		 *  step 2)
		 * 4. Write a value of 1 to FILE_IO_DIR_CHANGE.
		 * 5. Done.  Optionally get a list of items in the 
		 *  new CWD.
		 */
	};

	this.getDiskInfo = function() {
		/*
		 * Get disk size and free space
		 * 1. Read: FILE_IO_DISK_SECTOR_SIZE, 
		 *  FILE_IO_DISK_SECTORS_PER_CLUSTER, 
		 *  FILE_IO_DISK_TOTAL_CLUSTERS, 
		 *  FILE_IO_DISK_FREE_CLUSTERS. 
		 *  All disk parameters are captured when you 
		 *  read FILE_IO_DISK_SECTOR_SIZE.
		 * 2. Total size = SECTOR_SIZE * 
		 *  SECTORS_PER_CLUSTER *
		 *  TOTAL_CLUSTERS. 
		 * 3. Free size = SECTOR_SIZE * 
		 *  SECTORS_PER_CLUSTER * 
		 *  FREE_CLUSTERS.
		 */

		 // Also read FILE_IO_DISK_FORMAT_INDEX: 2=FAT, 3=FAT32
	};
	
	this.readFile = function() {
		/*
		 * Read a file
		 * 1. Write the length of the file name to 
		 *  FILE_IO_NAME_WRITE_LEN (add 1 for the 
		 *  null terminator)
		 * 2. Write the name to FILE_IO_NAME_WRITE 
		 *  (with null terminator)
		 * 3. Read from FILE_IO_OPEN
		 * 4. Read file data from FILE_IO_READ 
		 *  (using the size from FILE_IO_SIZE)
		 * 5. Write a value of 1 to FILE_IO_CLOSE
		 */
	};
}

module.exports.get = getFileSystemOperations;