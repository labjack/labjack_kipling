
var q = require('q');
var fs = require('fs');
var path = require('path');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();

var DEBUG_STARTUP_CONFIG_OPS = false;
var DEBUG_READ_CONFIG_OP = false;
var DEBUG_WRITE_CONFIG_OP = false;
var ENABLE_ERROR_OUTPUT = false;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugSC = getLogger(DEBUG_STARTUP_CONFIG_OPS);
var debugRC = getLogger(DEBUG_READ_CONFIG_OP);
var debugWC = getLogger(DEBUG_WRITE_CONFIG_OP);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

/*
 * Basic flash address keys, locations (offsets), and lengths are
 * documented on this basecamp page:
 * https://basecamp.com/1764385/projects/34645/documents/767398
 * 
 * Information that might be relevant to saving/restoring device settings:
 * StartupPowerSettings
 *     Address: 0x3BF000
 * Startup Settings
 *     Description:
 *     Key: 0x0D08CAEA
 *     Address: 0x3C0000
 *     Length: 0x001000
 * Device Config Settings
 *     Description:
 *     Key: 0x9CDD28F7
 *     Address: 0x3C1000
 *     Length: 0x001000
 * Comm Settings
 *     Description:
 *     Key: 0x2C69E1CE
 *     Address: 0x3C2000
 *     Length: 0x001000
 * Device Info
 *     Description:
 *     Key: 0x552684BA
 *     Address: 0x3C3000
 *     Length: 0x001000
 * Cal Valuex (0x3C4000)
 * SWDTSettings (0x3C5000)
 * Manufacturing Info (0x3C6000)
 * ...
 * NTP_Settings (0x3CC000)
 * AIN_EF_Settings (0x3CD000)
 * 
 * 
 * 
*/
function getStartupConfigOperations(self) {

	var manufacturingData = [{
		'str': 'Time of Test (UTC)',
		'searchStr': 'Time of test (UTC)',
		'key': 'timeOfTest',
		'type': 'str',
	}, {
		'str': 'LJM Version',
		'searchStr': 'LJM Version',
		'key': 'ljmVersion',
		'type': 'fl4',
	}, {
		'str': 'LJTestT7 Version',
		'searchStr': 'LJTestT7 Version',
		'key': 'ljtestVersion',
		'type': 'fl4',
	}, {
		'str': 'Jig Type',
		'searchStr': 'Jig type',
		'key': 'jigType',
		'type': 'int',
	}, {
		'str': 'Jig Code',
		'searchStr': 'Jig code',
		'key': 'jigCode',
		'type': 'int',
	}, {
		'str': 'Firmware Version',
		'searchStr': 'Firmware Version',
		'key': 'fwVersion',
		'type': 'fl4',
	}, {
		'str': 'Bootstrap Version',
		'searchStr': 'Bootstrap Version',
		'key': 'bsVersion',
		'type': 'fl4',
	}];

	var isData = /\s\s.*/;
	var select =/\S\S.*: /; 
	var clean = /\S\S.*/;
	var getData = /\S\S.*:\s(.*)/;
	
	function parseManufacturingData(data, dataType) {
		if(dataType === 'str') {
			return data;
		} else if(dataType === 'fl4') {
			return parseFloat(parseFloat(data).toFixed(4));
		} else if(dataType === 'int') {
			return parseInt(data);
		} else {
			return data;
		}
	}
	function parseManufacturingInfo(strPartial) {
		// console.log('in parseManufacturingInfo');
		var selectedPartial = select.exec(strPartial)[0]; //The section of text before the ": " characters.
		var strToSearch = selectedPartial.split(': ').join(''); //The partial w/o the ": " characters.
		var brokenPartial = getData.exec(strPartial);
		// var cleanPartial = clean.exec(strPartial)[0];
		var cleanPartial = brokenPartial[0]; // Remove initial whitespace.
		var data = brokenPartial[1];

		// console.log('selectedPartial:', selectedPartial);
		// console.log('cleanPartial:', brokenPartial);
		// console.log('data:', data);
		var key = 'unknown';
		var type = 'str';
		var str = cleanPartial;

		var foundString = manufacturingData.some(function(manData) {
			// console.log('Checking...', manData.str, strToSearch);
			if(manData.searchStr === strToSearch) {
				key = manData.key;
				type = manData.type;
				str = manData.str;
				return true;
			} else {
				return false;
			}
		});
		// console.log('key:', key);
		// console.log('type:', type);
		var parsedData = parseManufacturingData(data, type);
		// console.log('parsedData:', parsedData);

		var info = {
			'strToSearch': strToSearch,
			'str': str,
			'key': key,
			'type': type,
			'rawData': data,
			'data': parsedData,
			'orig': cleanPartial,
		};
		return info;
	}

	function saveParsedDataToBundle(bundle, info) {
		var type = info.type;
		var key = info.key;
		var data = info.data;
		if(type === 'str') {
			bundle.info[key] = bundle.info[key] + data;
		} else if(type === 'fl4') {
			bundle.info[key] = parseFloat(parseFloat(data).toFixed(4));
		} else if(type === 'int') {
			bundle.info[key] = parseInt(data);
		} else {
			bundle.info[key] = bundle.info[key].toString() + data.toString();
		}
		return bundle;
	}

	// Define a function that is used to initialize the data object built up
	// during the process of reading the manufacturing data from a T7.
	function createReadManufacturingInfoBundle() {
		debugRMIOps('in createReadManufacturingInfoBundle');
		
		// Initialize the bundle object with some basic data.
		var bundle = {
			'info': {},
			'infoString': '',
			'manufacturingData': manufacturingData,
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};

		// Initialize the manufacturing info object with dummy data.
		manufacturingData.forEach(function(manData) {
			if(manData.type === 'str') {
				bundle.info[manData.key] = '';
			} else if(manData.type === 'fl4') {
				bundle.info[manData.key] = 0.000;
			} else if(manData.type === 'int') {
				bundle.info[manData.key] = 0;
			} else {
				bundle.info[manData.key] = '';
			}
		});
		return bundle;
	}

	// Read the manufacturing data from a T7.
	function readManufacturingInfoFlashData(bundle) {
		debugRMIOps('in readManufacturingInfoFlashData');
		var defered = q.defer();
		var startingAddress = 0x3C6000;
		var numIntsToRead = 8*8;
		self.readFlash(startingAddress, numIntsToRead)
		.then(function(res) {
			// res is an object with an attribute "results" that is an array
			// of bytes.  Therefore this debug call outputs a lot of data:
			// debugRMIOps('in readManufacturingInfoFlashData res', res);
			var str = '';
			var rawData = [];
			res.results.forEach(function(val) {
				var bA = (val >> 24) & 0xFF;
				rawData.push(bA);
				var bB = (val >> 16) & 0xFF;
				rawData.push(bB);
				var bC = (val >> 8) & 0xFF;
				rawData.push(bC);
				var bD = (val >> 0) & 0xFF;
				rawData.push(bD);
			});
			function isASCII(str, extended) {
			    return (extended ? /^[\x00-\xFF]*$/ : /^[\x00-\x7F]*$/).test(str);
			}
			// debugRMIOps('in readManufacturingInfoFlashData', rawData);
			rawData.forEach(function(raw) {
				var newStrPartial = String.fromCharCode(raw);
				if(isASCII(newStrPartial)) {
					str += newStrPartial;
				}
			});
			debugRMIOps('in readManufacturingInfoFlashData', str);
			// console.log('Data:');
			// console.log(str);
			var noReturnChars = str.split('\r').join('');
			strPartials = noReturnChars.split('\n');

			var manufacturingInfoStr = '';
			// console.log('Processing partials');
			strPartials.forEach(function(strPartial) {
				try {
					// console.log('Checking partial', strPartial);
					if(isData.test(strPartial)) {
						// console.log('Parsing partial', strPartial);
						var parsedInfo = parseManufacturingInfo(strPartial);
						// console.log('Saving partial', strPartial, parsedInfo);
						manufacturingInfoStr += parsedInfo.str;
						manufacturingInfoStr += ': ';
						manufacturingInfoStr += parsedInfo.rawData;
						manufacturingInfoStr += '\n';
						bundle = saveParsedDataToBundle(bundle, parsedInfo);
					} else {
						// console.log('Not Checking partial', strPartial);
					}
				} catch(err) {
					errorLog('Error parsing partial (t7_manufacturing_info_ops.js)', err, strPartial);
					errorLog(err.stack);
					console.error('Error parsing partial (t7_manufacturing_info_ops.js)', err, strPartial);
				}
			});
			// console.log(noReturnChars);
			bundle.infoString = manufacturingInfoStr;
			// console.log(bundle.info);
			defered.resolve(bundle);
		}, function(err) {
			debugRMIOps('in readManufacturingInfoFlashData err', err);
			bundle.isError = true;
			bundle.errorStep = 'readManufacturingInfoFlashData';
			bundle.error = modbusMap.getErrorInfo(err);
			bundle.errorCode = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}

	this.readManufacturingInfo = function() {
		debugMIOps('* in readManufacturingInfo');
		var defered = q.defer();
		var bundle = createReadManufacturingInfoBundle();
		
		function succFunc(rBundle) {
			debugRMIOps('in readManufacturingInfo res');
			defered.resolve({
				'data': rBundle.info,
				'str': rBundle.infoString,
			});
		}
		function errFunc(rBundle) {
			debugRMIOps('in readManufacturingInfo err', rBundle);
			defered.reject(rBundle);
		}

		readManufacturingInfoFlashData(bundle)
		.then(succFunc)
		.catch(errFunc);
		return defered.promise;
	};

	
}

module.exports.get = getStartupConfigOperations;