
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();

var DEBUG_DASHBOARD_OPERATIONS = false;
var DEBUG_DASHBOARD_GET_ALL = false;
var DEBUG_DASHBOARD_UPDATE = false;
var DEBUG_FILE_SYSTEM_GET_CWD = false;
var DEBUG_FILE_SYSTEM_GET_LS = false;
var DEBUG_FILE_SYSTEM_GET_CD = false;
var DEBUG_FILE_SYSTEM_GET_DISK_INFO = false;
var DEBUG_FILE_SYSTEM_READ_FILE = false;
var DEBUG_FILE_SYSTEM_DELETE_FILE = false;
var ENABLE_ERROR_OUTPUT = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugDOps = getLogger(DEBUG_DASHBOARD_OPERATIONS);
var debugDGA = getLogger(DEBUG_DASHBOARD_GET_ALL);
var debugDU = getLogger(DEBUG_DASHBOARD_UPDATE);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

/*
 * Most of the documentation on this feature of the T7
 * is available on the webpage:
 * https://labjack.com/support/datasheets/t7/sd-card
*/
/*
 * This object is an event-emitter.  It emits events that should also
 * be emitted by the curated device object.
 */
function getDashboardOperations(self) {
	var dashboardListeners = {};
	function addListener(uid) {
		var addedListener = false;
		if(typeof(dashboardListeners[uid]) === 'undefined') {
			dashboardListeners[uid] = {
				'startTime': new Date(),
				'numIterations': 0,
				'uid': uid,
				'numStarts': 1,
			};
			addedListener = true;
		} else {
			// Don't add the listener.
			dashboardListeners[uid].numStarts += 1;
		}
		return addedListener;
	}

	function removeListener(uid) {
		var removedListener = false;
		if(typeof(dashboardListeners[uid]) !== 'undefined') {
			dashboardListeners[uid] = undefined;
			delete dashboardListeners[uid];
			removedListener = true;
		}
		return removedListener;
	}

	function getNumListeners() {
		return Object.keys(dashboardListeners).length;
	}

	this.testFunc = function() {
		var defered = q.defer();
		console.log("In Dashboard testFunc",
			self.savedAttributes.productType,
			self.savedAttributes.serialNumber,
			self.savedAttributes.serialNumber
		);
		defered.resolve();
		return defered.promise;
	};

	var dataCollector = undefined;
	
	var loopRunning = false;
	var daqLoopIntervalHandler = undefined;

	/*
	 * This function starts the dashboard-ops procedure and registers a listener.
	 * This function returns data required to initialize the dashboard page.  If
	 * the listener already exists then its uid isn't added (since it is already
	 * there).
	*/
	this.start = function(uid){
		var defered = q.defer();
		var addedListener = addListener(uid);
		var numListeners = getNumListeners();
		if(addedListener && (numListeners == 1)) {
			// We need to start the dashboard-service and we need to return 
			// the current state of all of the channels.
			defered.resolve();
		} else {
			// We don't need to start the dashboard-service.  We just need to
			// return the current state of all of the channels.
			defered.resolve();
		}
		return defered.promise;
	};

	/*
	 * These functions "pause" and "resume" the data-reporting
	 */
	this.pauseReporting = function(){};
	this.resumeReporting = function(){};

	/*
	 * These functions "pause" and "resume" the DAQ loop collecting data from
	 * the device.
	 */
	this.pauseCollecting = function(){};
	this.resumeCollecting = function(){};


	/* 
	 * This function stops the dashboard-ops procedure and un-registers a listener.
	 * If there are zero remaining listeners than the DAQ loop actually stops running.
	 */
	this.stop = function(uid){};
	

	/*
	 * getAll helper functions.
	 */
	// Define object for "getAll" operation.
	function createGetAllBundle(operation) {
		debugCWD('in createGetCWDBundle');
		var bundle ={
			'cwd': '',
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
		return bundle;
	}
	// Step #1 in "getCWD" Operation
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
	// Step #2 in "getCWD" Operation
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
	
	// Step #3 in "getCWD" Operation
	function getFileIONameRead(bundle) {
		debugCWD('in getFileIONameRead', bundle.FILE_IO_NAME_READ_LEN);
		var defered = q.defer();
		self.readArray('FILE_IO_NAME_READ', bundle.FILE_IO_NAME_READ_LEN)
		.then(function(cwdChars) {
			var str = '';
			cwdChars.forEach(function(cwdChar) {
				if(cwdChar !== 0) {
					str += String.fromCharCode(cwdChar);
				}
			});
			bundle.cwd = str;
			debugCWD('in getFileIONameRead', str);
			defered.resolve(bundle);
		}, function(err) {
			debugCWD('in getFileIONameRead err', err);
			bundle.isError = true;
			bundle.errorStep = 'getFileIONameRead';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	/*
	 * T7 Instructions:
	 * 1. Read the following registers: 
	 *    - AIN#(0:13)
	 *    - DAC#(0:1)
	 *    - FIO_STATE
	 *    - FIO_DIRECTION
	 *    - EIO_STATE
	 *    - EIO_DIRECTION
	 *    - CIO_STATE
	 *    - CIO_DIRECTION
	 *    - MIO_STATE
	 *    - MIO_DIRECTION
	 * 2. Parse the xxx_STATE and xxx_DIRECTION registers
	 * 3. Organize data into defined channels "dashboard_channels.json"

	 * 1. Write a value of 1 to FILE_IO_DIR_CURRENT. The error 
	 *  returned indicates whether there is a directory loaded as 
	 *  current. No error (0) indicates a valid directory.
	 * 2. Read  FILE_IO_NAME_READ_LEN.
	 * 3. Read an array of size FILE_IO_NAME_READ_LEN from 
	 *  FILE_IO_NAME_READ.
	 * 4. Resultant string will be something like "/" for 
	 * the root directory, or "/DIR1/DIR2" for a directory.
	*/
	function innerGetAll(bundle) {
		return startGetCWDOperation(bundle)
		.then(getFileIONameReadLen)
		.then(getFileIONameRead);
	}
	this.getAll = function() {
		debugDOps('* in getAll');
		var defered = q.defer();
		var bundle = createGetCWDBundle();
		
		function succFunc(rBundle) {
			debugDGA('in getAll res');
			defered.resolve(rBundle);
		}
		function errFunc(rBundle) {
			debugDGA('in getAll err', rBundle);
			defered.reject(rBundle);
		}

		innerGetAll(bundle)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	/*
	 * Helper functions for "readdir"
	 */
	function parseReaddirOptions (options) {
			var parsedOptions = {
				'pathProvided': false,
				'path': '/',
			};
			if(options) {
				if(options.path) {
					parsedOptions.path = options.path;
					parsedOptions.pathProvided = true;
				}
			}
			return parsedOptions;
		}
	// Define object for "readdir" operation.
	function createReaddirBundle(options) {
		return {
			'changeDir': false,
			'pathProvided': options.pathProvided,
			'path': options.path,
			'readdirPath': options.path,
			'cwd': '',
			'startingDir': '',
			'fileNames': [],
			'files': [],
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
	}

	function saveCWDPrepForInitialCD(bundle) {
		debugLS('in saveCWDAsStartingCWD');
		var defered = q.defer();
		// If the a path option was provided
		if(bundle.pathProvided) {
			// Check to see if we are already at the requested path
			if(bundle.cwd != bundle.path) {
				bundle.changeDir = true;
			} else {
				// Make sure that the CWD doesn't get changed.
				bundle.changeDir = false;
			}
			bundle.startingDir = bundle.cwd;
		} else {
			// Make sure that the CWD doesn't get changed.
			bundle.changeDir = false;
			bundle.readdirPath = bundle.cwd;
		}
		defered.resolve(bundle);
		return defered.promise;
	}

	function prepForFinalCD(bundle) {
		debugLS('in saveCWDAsStartingCWD');
		var defered = q.defer();
		if(bundle.changeDir) {
			bundle.path = bundle.startingDir;
		}
		defered.resolve(bundle);
		return defered.promise;
	}
	// Step #1 in "readdir" Operation
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
	// Step #2 in "readdir" Operation
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
	// Step #3 in "readdir" Operation
	function readAndSaveFileListing(bundle) {
		debugLS('in readAndSaveFileListing');
		var defered = q.defer();
		self.readArray('FILE_IO_NAME_READ', bundle.FILE_IO_NAME_READ_LEN.val)
		.then(function(fileNameChars) {
			debugLS('in readAndSaveFileListing raw', fileNameChars);
			var fileName = '';
			fileNameChars.forEach(function(fileNameChar) {
				if(fileNameChar !== 0) {
					fileName += String.fromCharCode(fileNameChar);
				}
			});
			// Save the file name.
			bundle.fileNames.push(fileName);
			debugLS('Debug CWD:', bundle.cwd, fileName);
			var filePath = path.posix.join(bundle.cwd, fileName);
			var pathInfo = path.posix.parse(filePath);
			var fileInfo = {
				'name': fileName,
				'ext': pathInfo.ext,
				'path': filePath,
				'pathInfo': pathInfo,
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
	
	// Define some error codes that cound indicate that there are no more
	// files to be listed when checking for more files.
	var LJM_ERR_FILE_IO_NOT_FOUND = 2960;
	var LJM_ERR_FILE_IO_END_OF_CWD = 2966;
	var LJM_ERR_FILE_IO_INVALID_OBJECT = 2809;
	var acceptableCheckForMoreFilesErrCodes = [
		LJM_ERR_FILE_IO_NOT_FOUND,
		LJM_ERR_FILE_IO_END_OF_CWD,
		LJM_ERR_FILE_IO_INVALID_OBJECT
	];

	// Step #4 in "readdir" Operation
	function checkForMoreFiles(bundle) {
		debugLS('in checkForMoreFiles');
		var defered = q.defer();

		self.iWrite('FILE_IO_DIR_NEXT', 1)
		.then(function(res) {
			debugLS('in checkForMoreFiles res');
			// If there wasn't an error then there are more files that need
			// to be read.

			getReaddirAttributes(bundle)
			.then(readAndSaveFileListing)
			.then(checkForMoreFiles)
			.then(defered.resolve)
			.catch(defered.reject);
		}, function(err) {
			// Determine if there are more files to look for.
			if(acceptableCheckForMoreFilesErrCodes.indexOf(err) >= 0) {
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

	function innerReaddir(bundle) {
		return innerGetCWD(bundle)
		.then(saveCWDPrepForInitialCD)
		.then(innerChangeDirectory)
		.then(startReaddirOperation)
		.then(getReaddirAttributes)
		.then(readAndSaveFileListing)
		.then(checkForMoreFiles)
		.then(prepForFinalCD)
		.then(innerChangeDirectory);
	}
	this.readdir = function(options) {
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

		debugDOps('* in readdir');
		var defered = q.defer();
		var parsedOptions = parseReaddirOptions(options);
		var bundle = createReaddirBundle(parsedOptions);

		function succFunc(rBundle) {
			debugLS('in readdir res');
			defered.resolve({
				'cwd': rBundle.cwd,
				'path': rBundle.readdirPath,
				'fileNames': rBundle.fileNames,
				'files': rBundle.files,
			});
		}
		function errFunc(rBundle) {
			var resolve = false;
			if(rBundle.errorStep === 'startReaddirOperation') {
				if(rBundle.errorCode == 2809) {
					resolve = true;
				}
			}
			if(resolve) {
				defered.resolve({
					'cwd': rBundle.cwd,
					'fileNames': rBundle.fileNames,
					'files': rBundle.files,
				});
			} else {
				debugLS('in readdir err', rBundle);
				defered.reject(rBundle);
			}
		}

		innerReaddir(bundle)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	/*
	 * Helper functions for the "changeDirectory" operation.
	 */
	function parseChangeDirectoryOptions (options) {
		var parsedOptions = {
			'changeDir': false,
			'path': '/',
		};
		if(options) {
			if(options.path) {
				parsedOptions.path = options.path;
				parsedOptions.changeDir = true;
			}
		}
		return parsedOptions;
	}
	function getChangeDirectoryBundle(options) {
		debugCD('in getChangeDirectoryBundle');
		var bundle ={
			'changeDir': options.changeDir,
			'path': options.path,
			'cwd': '',
			'directoryNameArray': [],
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
		return bundle;
	}
	function populateDirectoryNameArray(bundle) {
		debugCD('in populateDirectoryNameArray');
		var defered = q.defer();

		// Make sure to clear the directoryNameArray before saving data to it.
		bundle.directoryNameArray = [];

		// Fill the directoryNameArray with char codes.
		var dir = bundle.path;
		for(var i = 0; i < dir.length; i++) {
			bundle.directoryNameArray.push(dir.charCodeAt(i));
		}

		// Add one null-terminator byte.
		bundle.directoryNameArray.push(0);
		bundle.directoryNameArray.push(0);
		bundle.directoryNameArray.push(0);

		defered.resolve(bundle);
		return defered.promise;
	}
	function writeDesiredDirectoryNameSize(bundle) {
		debugCD('in writeDesiredDirectoryNameSize');
		var defered = q.defer();

		self.iWrite('FILE_IO_NAME_WRITE_LEN', bundle.directoryNameArray.length)
		.then(function(res) {
			debugCD('in writeDesiredDirectoryNameSize res', res);
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugCD('in writeDesiredDirectoryNameSize err', err);
			bundle.isError = true;
			bundle.errorStep = 'writeDesiredDirectoryNameSize';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function writeDesiredDirectoryName(bundle) {
		debugCD('in writeDesiredDirectoryName');
		var defered = q.defer();

		self.writeArray('FILE_IO_NAME_WRITE', bundle.directoryNameArray)
		.then(function(res) {
			debugCD('in writeDesiredDirectoryName res', res);
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugCD('in writeDesiredDirectoryName err', err);
			bundle.isError = true;
			bundle.errorStep = 'writeDesiredDirectoryName';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function executeChangeDirectoryCommand(bundle) {
		debugCD('in executeChangeDirectoryCommand');
		var defered = q.defer();

		self.iWrite('FILE_IO_DIR_CHANGE', 1)
		.then(function(res) {
			debugCD('in executeChangeDirectoryCommand res', res);
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugCD('in executeChangeDirectoryCommand err', err);
			bundle.isError = true;
			bundle.errorStep = 'executeChangeDirectoryCommand';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function innerChangeDirectory(bundle) {
		if(bundle.changeDir) {
			return populateDirectoryNameArray(bundle)
			.then(writeDesiredDirectoryNameSize)
			.then(writeDesiredDirectoryName)
			.then(executeChangeDirectoryCommand)
			.then(innerGetCWD);
		} else {
			// console.log('FS Debug: Not Changing Directory');
			return innerGetCWD(bundle);
		}
	}
	this.changeDirectory = function(options) {
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
		debugDOps('* in changeDirectory');
		var defered = q.defer();
		var parsedOptions = parseChangeDirectoryOptions(options);
		var bundle = getChangeDirectoryBundle(parsedOptions);

		function succFunc(rBundle) {
			debugCD('in changeDirectory res');
			defered.resolve({
				'cwd': rBundle.cwd,
			});
		}
		function errFunc(rBundle) {
			debugCD('in changeDirectory err', rBundle);
			defered.reject(rBundle);
		}

		innerChangeDirectory(bundle)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	var GET_DISK_INFO_NAME_CONVERSIONS = {
		'FILE_IO_DISK_SECTOR_SIZE': 'sectorSize',
		'FILE_IO_DISK_SECTOR_SIZE_BYTES': 'sectorSize',
		'FILE_IO_DISK_SECTORS_PER_CLUSTER': 'sectorsPerCluster',
		'FILE_IO_DISK_TOTAL_CLUSTERS': 'totalClusters',
		'FILE_IO_DISK_FREE_CLUSTERS': 'freeClusters',
		'FILE_IO_DISK_FORMAT_INDEX': 'formatIndex',
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
		debugDOps('* in getDiskInfo');
		var defered = q.defer();

		self.iReadMultiple([
			// 'FILE_IO_DISK_SECTOR_SIZE',
			'FILE_IO_DISK_SECTOR_SIZE_BYTES',
			'FILE_IO_DISK_SECTORS_PER_CLUSTER',
			'FILE_IO_DISK_TOTAL_CLUSTERS',
			'FILE_IO_DISK_FREE_CLUSTERS',
			'FILE_IO_DISK_FORMAT_INDEX',
		])
		.then(function(results) {
			debugDiskInfo(' in getDiskInfo res', results);

			var info = {};
			
			results.forEach(function(result) {
				var data = result.data;
				var sName = GET_DISK_INFO_NAME_CONVERSIONS[data.name];
				if(typeof(sName) === 'undefined') {
					sName = data.name;
				}

				info[sName] = data;
			});

			var sectorSize = info.sectorSize.res;
			var sectorsPerCluster = info.sectorsPerCluster.res;
			var totalClusters = info.totalClusters.res;
			var freeClusters = info.freeClusters.res;

			var totalSize = sectorSize * sectorsPerCluster * totalClusters;
			var freeSpace = sectorSize * sectorsPerCluster * freeClusters;

			var totalSizeInfo = {'str': '', 'res': totalSize, 'val': totalSize};
			var freeSpaceInfo = {'str': '', 'res': freeSpace, 'val': freeSpace};


			function populateBytesInfo(obj, val) {
				var multiples = [
					{'unit': 'B', 'mult': 1},
					{'unit': 'KB', 'mult': 1000},
					{'unit': 'MB', 'mult': 1000000},
					{'unit': 'GB', 'mult': 1000000000},
				];
				multiples.forEach(function(multiple) {
					var str = multiple.unit.toLowerCase();
					var unitVal = parseFloat((val/multiple.mult).toFixed(3));
					obj[str] = unitVal;
					if(val >= multiple.mult) {
						obj.str = unitVal.toString() + ' ' + multiple.unit;
						obj.val = unitVal;
					}
				});
			}
			populateBytesInfo(totalSizeInfo, totalSize);
			populateBytesInfo(freeSpaceInfo, freeSpace);
			
			defered.resolve({
				// 'totalSize': totalSize,
				// 'totalSizeInfo': totalSizeInfo,
				'totalSize': totalSizeInfo,
				// 'freeSpace': freeSpace,
				// 'freeSpaceInfo': freeSpaceInfo,
				'freeSpace': freeSpaceInfo,
				'fileSystem': info.formatIndex.fileSystem,
			});
		}, function(err) {
			debugDiskInfo(' in getDiskInfo err', err);
			defered.reject();
		});
		return defered.promise;
	};

	/*
	 * readFile helper functions
	 */
	function parseReadFileOptions(options) {
		var parsedOptions = {
			'path': '',
			'numBytesToRead': -1,
		};
		if(options) {
			if(options.path) {
				parsedOptions.path = options.path;
			}
			if(options.numBytesToRead) {
				parsedOptions.numBytesToRead = options.numBytesToRead;
			}
		}
		return parsedOptions;
	}
	function getReadFileBundle(options) {
		var pathInfo = path.parse(options.path);

		debugRF('in getReadFileBundle, path info:', pathInfo);
		var bundle = {
			'fileName': pathInfo.base,
			'filePath': options.path,
			'fileRootPath': pathInfo.dir,
			'filePathInfo': pathInfo,
			'startingDirectory': '',
			'cwd': '',// To be used as a temporary location to store the cwd.
			'path': '',
			'changeDir': true, // Set this boolean flag to 
			'directoryNameArray': [],
			'files': [],
			'fileNames': [],
			'fileSize': undefined,
			'fileInfo': undefined,
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
		return bundle;
	}
	
	
	function getFileSize_saveCWDConfigChangeDir(bundle) {
		debugRF('in getFileSize_saveCWDConfigChangeDir');
		var defered = q.defer();
		// Save the acquired cwd to the startingDirectory attribute.
		bundle.startingDirectory = '' + bundle.cwd;

		// Configure the "path" variable that is used by the changeDirectory
		// function
		bundle.path = '' + bundle.fileRootPath;
		bundle.changeDir = true;
		defered.resolve(bundle);
		return defered.promise;
	}
	function getFileSize_interpretReaddirResults(bundle) {
		debugRF('in getFileSize_interpretReaddirResults');
		var defered = q.defer();
		
		var fileName = bundle.fileName;
		var fileInfoIndex = bundle.fileNames.indexOf(fileName);
		var fileInfo = bundle.files[fileInfoIndex];

		// Prepare to change back to the original cwd.
		bundle.path = '' + bundle.startingDirectory;

		if(fileInfo) {
			bundle.fileInfo = fileInfo;
			bundle.fileSize = fileInfo.size;
			debugRF('We found the file\'s info!!', fileInfo);
			defered.resolve(bundle);
		} else {
			debugRF('in getFileSize_interpretReaddirResults err');
			debugRF('We couldn\'t find the file\'s info', bundle.fileNames);
			bundle.isError = true;
			bundle.errorStep = 'getFileSize_interpretReaddirResults';
			// bundle.error = modbusMap.getErrorInfo(err);
			bundle.error = new Error('Can not determine size of file.  File may not exist: ' + bundle.fileName);
			defered.reject(bundle);
		}
		// if(fileInfo) {
		// 	if(fileInfo.isFile) {
		// 		bundle.fileInfo = fileInfo;
		// 		bundle.fileSize = fileInfo.size;
		// 		debugRF('We found the file\'s info!!', fileInfo);
		// 		defered.resolve(bundle);
		// 	} else {
		// 		debugRF('in getFileSize_interpretReaddirResults err');
		// 		debugRF('We are trying to open a directory...', fileInfo);
		// 		bundle.isError = true;
		// 		bundle.errorStep = 'getFileSize_interpretReaddirResults';
		// 		bundle.error = new Error('Can not open a directory as a file.');
		// 		defered.reject(bundle);
		// 	}
		// } else {
		// 	debugRF('in getFileSize_interpretReaddirResults err');
		// 	debugRF('We couldn\'t find the file\'s info', bundle.fileNames);
		// 	bundle.isError = true;
		// 	bundle.errorStep = 'getFileSize_interpretReaddirResults';
		// 	// bundle.error = modbusMap.getErrorInfo(err);
		// 	bundle.error = new Error('Can not determine size of file.');
		// 	defered.reject(bundle);
		// }
		return defered.promise;
	}
	function innerGetFileSize(bundle) {
		return innerGetCWD(bundle)
		.then(getFileSize_saveCWDConfigChangeDir)
		.then(innerChangeDirectory)
		.then(innerReaddir)
		.then(getFileSize_interpretReaddirResults)
		.then(innerChangeDirectory);
	}

	function innerReadFileData_preparePathAttr(bundle) {
		debugRF('in innerReadFileData_preparePathAttr');
		var defered = q.defer();
		// Save the acquired cwd to the startingDirectory attribute.
		bundle.path = '' + bundle.filePath;


		defered.resolve(bundle);
		return defered.promise;
	}

	function executeFileOpenCommand(bundle) {
		debugRF('in executeFileOpenCommand');
		var defered = q.defer();

		self.iWrite('FILE_IO_OPEN', 1)
		.then(function(res) {
			debugRF('in executeFileOpenCommand res');
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugRF('in executeFileOpenCommand err', err);
			bundle.isError = true;
			bundle.errorStep = 'executeFileOpenCommand';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function readFileData(bundle) {
		debugRF('in readFileData', bundle.fileSize);
		var defered = q.defer();
		self.readArray('FILE_IO_READ', bundle.fileSize)
		.then(function(cwdChars) {
			var str = '';
			cwdChars.forEach(function(cwdChar) {
				if(cwdChar !== 0) {
					str += String.fromCharCode(cwdChar);
				}
			});
			bundle.readFileData = str;
			debugRF('in readFileData', str);
			defered.resolve(bundle);
		}, function(err) {
			debugRF('in readFileData err', err);
			bundle.isError = true;
			bundle.errorStep = 'readFileData';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}

	function closeOpenFile(bundle) {
		debugRF('in closeOpenFile');
		var defered = q.defer();

		self.iWrite('FILE_IO_CLOSE', 1)
		.then(function(res) {
			debugRF('in closeOpenFile res');
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugRF('in closeOpenFile err', err);
			bundle.isError = true;
			bundle.errorStep = 'closeOpenFile';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}

	function innerReadFileData(bundle) {
		return innerReadFileData_preparePathAttr(bundle)
		.then(populateDirectoryNameArray)
		.then(writeDesiredDirectoryNameSize)
		.then(writeDesiredDirectoryName)
		.then(executeFileOpenCommand)
		.then(readFileData)
		.then(closeOpenFile);
	}

	this.readFile = function(options) {
		/*
		 * Read a file (As per website...)
		 * 1. Write the length of the file name to 
		 *  FILE_IO_NAME_WRITE_LEN (add 1 for the 
		 *  null terminator)
		 * 2. Write the name to FILE_IO_NAME_WRITE 
		 *  (with null terminator)
		 * 3. Read from FILE_IO_OPEN, ?? Write a 1 to FILE_IO_OPEN?
		 * 4 Read the FILE_IO_SIZE register.
		 * 5. Read file data from FILE_IO_READ
		 * 6. Write a value of 1 to FILE_IO_CLOSE
		 */
		/*
		 * Actual steps require branching logic/memory...
		 * 1. Determine if we need to figure out the size of the file.  If we
		 *    do then the process is much harder.
		 *
		 * Steps when file size is not provided:
		 * 1. Get the current working directory
		 * 2. Change to the directory where the file is located.
		 * 3. Get the file information for all of the files in the directory.
		      You can stop when you found the file in question or just read
		      everything.
		 * 4. Read the file.
		 * 5. Close the file.
		 * 6. Change the current working directory back to where we were
		      originally.
		 * Steps when file size is provided:
		 * 1. Read the file.
		 * 2. Close the file.
		*/
		debugDOps('* in readFile');
		var parsedOptions = parseReadFileOptions(options);
		var bundle = getReadFileBundle(parsedOptions);
		var defered = q.defer();

		function succFunc(rBundle) {
			debugRF('in readFile res', rBundle.readFileData.length);
			defered.resolve({
				'data': rBundle.readFileData,
				'fileInfo': rBundle.fileInfo,
				// 'filePathInfo': rBundle.filePathInfo,
			});
		}
		function errFunc(rBundle) {
			debugRF('in readFile err', rBundle);
			defered.reject(rBundle);
		}

		// populateDirectoryNameArray(bundle) // step 1
		// .then(writeDesiredDirectoryNameSize) // step 1.5
		// .then(writeDesiredDirectoryName) // step 2
		// .then(executeFileOpenCommand)
		// .then(getOpenFileStatistics)
		// .then(readFileData)
		// .then(readFileDataB)
		// .then(closeOpenFile)

		innerGetFileSize(bundle)
		.then(innerReadFileData)

		// populateDirectoryNameArray(bundle)
		// .then(writeDesiredDirectoryNameSize)
		// .then(writeDesiredDirectoryName)
		// .then(executeChangeDirectoryCommand)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};
	function parseGetFilePreviewOptions(options) {
		var parsedOptions = {
			'path': '',
			'numBytesToRead': 50,
		};
		if(options) {
			if(options.path) {
				parsedOptions.path = options.path;
			}
			if(options.numBytesToRead) {
				parsedOptions.numBytesToRead = options.numBytesToRead;
			}
		}
		return parsedOptions;
	}
	this.getFilePreview = function(options) {
		var parsedOptions = parseGetFilePreviewOptions(options);
		return self.readFile(parsedOptions);
	};

	function parseDeleteFileOptions(options) {
		var parsedOptions = {
			'path': '',
		};
		if(options) {
			if(options.path) {
				parsedOptions.path = options.path;
			}
		}
		return parsedOptions;
	}
	function getDeleteFileBundle(options) {
		var bundle = {
			'filePath': options.path,
			'path': '',
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};
		return bundle;
	}

	function executeFileDeleteCommand(bundle) {
		debugDF('in executeFileDeleteCommand');
		var defered = q.defer();

		self.iWrite('FILE_IO_DELETE', 1)
		.then(function(res) {
			debugDF('in executeFileDeleteCommand res');
			defered.resolve(bundle);
		}, function(err) {
			// There was some weird issue...
			debugDF('in executeFileDeleteCommand err', err);
			bundle.isError = true;
			bundle.errorStep = 'executeFileDeleteCommand';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}

	function innerDeleteFile(bundle) {
		bundle.path = '' + bundle.filePath;
		return populateDirectoryNameArray(bundle)
		.then(writeDesiredDirectoryNameSize)
		.then(writeDesiredDirectoryName)
		.then(executeFileDeleteCommand);
	}
	this.deleteFile = function(options) {
		/*
		 * This is currently un-documented.
		 */
		debugDOps('* in deleteFile');

		var parsedOptions = parseDeleteFileOptions(options);
		var bundle = getDeleteFileBundle(parsedOptions);
		var defered = q.defer();

		function succFunc(rBundle) {
			debugDF('in deleteFile res', rBundle);
			defered.resolve({
				'path': rBundle.filePath,
			});
		}
		function errFunc(rBundle) {
			debugDF('in deleteFile err', rBundle);
			defered.reject(rBundle);
		}

		innerDeleteFile(bundle)		
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};
}

util.inherits(getDashboardOperations, EventEmitter);

module.exports.get = getDashboardOperations;