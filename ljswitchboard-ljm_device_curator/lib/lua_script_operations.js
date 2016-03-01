
var q = require('q');
var fs = require('fs');
var path = require('path');

var DEBUG_LOAD_STEPS = false;
function debugLoadStep() {
	if(DEBUG_LOAD_STEPS) {
		console.log.apply(console, arguments);
	}
}

var ENABLE_ERROR_OUTPUT = false;
function errorLog() {
	if(ENABLE_ERROR_OUTPUT) {
		console.error.apply(console, arguments);
	}
}
function getLuaScriptOperations(self) {
	/**
	 * Lua Script related functions:
	**/
	this.stopLuaScript = function(options) {
		var reg = 'LUA_RUN';
		var evalStr = 'x === 0';
		var maxAttempts = 5;
		var delay = 250;
		var writeOptions = {
			'register': reg,
			'value': 0,
		};
		var readOptions = {
			'register': reg,
			'evalStr': evalStr,
			'maxAttempts': maxAttempts,
			'delay': delay,
		};
		if(options) {
			var keys = Object.keys(options);
			keys.forEach(function(key) {
				readOptions[key] = options[key];
			});
		}
		return self.writeReadAndEvaluate(writeOptions, readOptions);
	};
	this.startLuaScript = function(options) {
		var reg = 'LUA_RUN';
		var evalStr = 'x === 1';
		var maxAttempts = 5;
		var delay = 250;
		var writeOptions = {
			'register': reg,
			'value': 1,
		};
		var readOptions = {
			'register': reg,
			'evalStr': evalStr,
			'maxAttempts': maxAttempts,
			'delay': delay,
		};
		if(options) {
			var keys = Object.keys(options);
			keys.forEach(function(key) {
				readOptions[key] = options[key];
			});
		}
		return self.writeReadAndEvaluate(writeOptions, readOptions);
	};

	function parseLoadLuaScriptOptions(options) {
		var parsedOptions = {
			'filePath': '',
			'url': '',
			'raw': '',
			'loadMethod': 'raw',
		};

		if(options) {
			if(options.filePath) {
				parsedOptions.filePath = options.filePath;
				if(options.filePath !== '') {
					parsedOptions.loadMethod = 'filePath';
				}
			}
			if(options.url) {
				parsedOptions.url = options.url;
				if(options.url !== '') {
					parsedOptions.loadMethod = 'url';
					errorLog('script loading by url is not supported');
				}
			}
			if(options.raw) {
				parsedOptions.raw = options.raw;
				if(options.raw !== '') {
					parsedOptions.loadMethod = 'raw';
				}
			}
		}
		return parsedOptions;
	}
	function generateLoadLuaScriptBundle(options) {
		return {
			'scriptStopped': false,
			'loadedLuaScript': false,
			'scriptDataArrayGenerated': false,
			'scriptSpaceAllocated': false,
			'scriptWritten': false,
			'options': options,
			'scriptDataArray': [],
			'isError': false,
			'errorStep': '',
			'error': undefined,
		};
	}
	function innerStopLuaScript(bundle) {
		debugLoadStep('in innerStopLuaScript');
		var defered = q.defer();
		function successFunc(data) {
			defered.resolve(bundle);
		}
		function errorFunc(data) {
			errorLog('Failed to stop the current script', err);
			bundle.scriptStopped = false;
			bundle.isError = true;
			bundle.errorStep = 'innerStopLuaScript';
			bundle.error = data;
			defered.reject(bundle);
		}
		self.stopLuaScript({'rejectOnError': true})
		.then(successFunc)
		.catch(errorFunc);
		return defered.promise;
	}
	// function innerStartLuaScript(bundle) {
	// 	var defered = q.defer();
	// 	function successFunc(data) {
	// 		defered.resolve(bundle);
	// 	}
	// 	function errorFunc(data) {
	// 		bundle.scriptStopped = false;
	// 		bundle.isError = true;
	// 		bundle.errorStep = 'innerStartLuaScript';
	// 		bundle.error = data;
	// 		defered.reject(bundle);
	// 	}
	// 	self.startLuaScript({'rejectOnError': true})
	// 	.then(successFunc)
	// 	.catch(errorFunc);
	// 	return defered.promise;
	// }
	function innerLoadLuaScriptData(bundle) {
		debugLoadStep('in innerLoadLuaScriptData');
		var defered = q.defer();
		if(bundle.options.loadMethod === 'filePath') {
			fs.readFile(bundle.options.filePath, function(err, data) {
				if(err) {
					errorLog('Failed to load script from file', err);
					bundle.loadedLuaScript = false;
					bundle.isError = true;
					bundle.errorStep = 'innerLoadLuaScriptData';
					bundle.error = err;
					defered.reject(bundle);
				} else {
					bundle.loadedLuaScript = true;
					bundle.options.raw = data.toString();
					defered.resolve(bundle);
				}
			});
		} else {
			bundle.loadedLuaScript = true;
			defered.resolve(bundle);
		}
		return defered.promise;
	}
	function innerGenerateScriptDataArray(bundle) {
		debugLoadStep('in innerGenerateScriptDataArray');
		var defered = q.defer();
		var luaSourceBuf;
		var luaScriptData = bundle.options.raw;
		try {
            luaSourceBuf = JSON.parse(JSON.stringify(luaScriptData));
            for(var i = 0; i < luaSourceBuf.length; i++) {
                bundle.scriptDataArray.push(luaSourceBuf.charCodeAt(i));
            }

            // Add 3 null characters
            bundle.scriptDataArray.push(0);
            bundle.scriptDataArray.push(0);
            bundle.scriptDataArray.push(0);
            bundle.scriptDataArrayGenerated = true;
            defered.resolve(bundle);
        } catch(err) {
            errorLog('Not writing source, in luaDeviceController.writeLuaScript', err);
            bundle.scriptDataArrayGenerated = false;
			bundle.isError = true;
			bundle.errorStep = 'innerGenerateScriptDataArray';
			bundle.error = err;
			defered.reject(bundle);
        }
        return defered.promise;
	}
	function innerAllocateScriptSpace(bundle) {
		var defered = q.defer();
		debugLoadStep('in innerAllocateScriptSpace', bundle.scriptDataArray.length);
		self.iWrite('LUA_SOURCE_SIZE', bundle.scriptDataArray.length)
		.then(function(res) {
			bundle.scriptSpaceAllocated = true;
			defered.resolve(bundle);
		}, function(err) {
			errorLog('Failed to allocate script space', err);
			bundle.scriptSpaceAllocated = false;
			bundle.isError = true;
			bundle.errorStep = 'innerAllocateScriptSpace';
			bundle.error = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}
	function innerSaveLuaScriptToDevice(bundle) {
		var defered = q.defer();
		debugLoadStep('in innerSaveLuaScriptToDevice');
		self.writeArray('LUA_SOURCE_WRITE', bundle.scriptDataArray)
		.then(function(data) {
			bundle.scriptWritten = true;
			defered.resolve(bundle);
		}, function(err) {
			errorLog('Failed to save script to device', err);
			bundle.scriptWritten = false;
			bundle.isError = true;
			bundle.errorStep = 'innerSaveLuaScriptToDevice';
			bundle.error = err;
			defered.reject(bundle);
		});
		return defered.promise;
	}

	this.loadLuaScript = function(options) {
		var defered = q.defer();
		var parsedOptions = parseLoadLuaScriptOptions(options);
		var bundle = generateLoadLuaScriptBundle(parsedOptions);

		function finishFunc(innerBundle) {
			defered.resolve({
				'data': 'yay'
			});
		}
		function errorFunc(innerBundle) {
			defered.reject({
				'error!!': 'yay',
				'data': innerBundle,
			});
		}
		innerStopLuaScript(bundle)
		.then(innerLoadLuaScriptData)
		.then(innerGenerateScriptDataArray)
		.then(innerAllocateScriptSpace)
		.then(innerSaveLuaScriptToDevice)
		.then(finishFunc)
		.catch(errorFunc);
		
		return defered.promise;
	};
}

module.exports.get = getLuaScriptOperations;