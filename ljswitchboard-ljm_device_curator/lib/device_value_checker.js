
var path = require('path');
var util = require('util');
var q = require('q');
var async = require('async');
var vm = require('vm');
var fs = require('fs');

var DEBUG_VALUE_CHECKER = false;
function debug() {
	if(DEBUG_VALUE_CHECKER) {
		console.log.apply(console, arguments);
	}
}

var ENABLE_ERROR_OUTPUT = false;
function errorLog() {
	if(ENABLE_ERROR_OUTPUT) {
		console.error.apply(console, arguments);
	}
}

function createDeviceValueChecker(self) {
	function createValueChecker (options) {
    	var context = {
    		'register': options.register,
    		'startTime': new Date(),
    		'maxAttempts': options.maxAttempts,
    		'currentAttempt': 0,
    		'delay': options.delay,
    		'evalStr': options.evalStr,
    		'script': new vm.Script(options.evalStr),
    		'rejectOnError': options.rejectOnError,
    	};

    	this.defered = undefined;
    	
    	// This function reports data when the value-checking has completed.
    	function reportResult(devRes, scriptRes, method) {
    		debug('in performRetry', devRes, scriptRes, method);
    		var returnData = {
    			'numAttempts': context.currentAttempt,
    			'maxAttempts': context.maxAttempts,
    			// 'startTime': new Date(),
    			// 'finishTime': new Date(),
    			'scriptRes': scriptRes,
    			'evalStr': context.evalStr,
    			'delay': context.delay,
    			'register': context.register,
    		};
    		var devResKeys = Object.keys(devRes);
    		devResKeys.forEach(function(key) {
    			returnData[key] = devRes[key];
    		});
    		valChecker.defered[method](returnData);
    	}


    	// This function performs the re-try logic.  It re-attempts a read
    	// or reports the results.
    	function performRetry(devRes, scriptRes) {
    		var currentAttempt = context.currentAttempt;
			var maxAttempts = context.maxAttempts;
			var delay = context.delay;
			debug('in performRetry', currentAttempt, maxAttempts, delay);
    		if(currentAttempt < maxAttempts) {
    			context.currentAttempt += 1;
    			setTimeout(checkDeviceValue, delay);
    		} else {
    			if(context.rejectOnError) {
    				reportResult(devRes, scriptRes, 'reject');
    			} else {
    				reportResult(devRes, scriptRes, 'resolve');
    			}
    		}
    	}

    	// This function performs the actual device I/O and runs the user's eval
    	// string to check the result.
    	function checkDeviceValue() {
    		debug('Checking Device Value');
    		self.iRead(context.register)
    		.then(function(res) {
    			var val = res.val;
    			var sandbox = {
    				'x': val,
    			};
    			var scriptContext = new vm.createContext(sandbox);
    			var result = context.script.runInContext(scriptContext);
    			if(result) {
    				reportResult(res, result, 'resolve');
    			} else {
    				performRetry(res, result);
    			}
    		}, function(err) {
    			errorLog('Error...', err);
    		});
    	}

    	// This function kicks-off the value checker.
    	this.run = function(defered) {
    		valChecker.defered = defered;
    		checkDeviceValue();
    	};
    	var valChecker = this;
    }

    function parseReadAndEvaluateOptions(options) {
    	var parsedOptions = {
    		'register': 'AIN0',
    		'evalStr': 'x < 100',
    		'maxAttempts': 2,
    		'delay': 100,
    		'rejectOnError': false,
    	};
    	if(options) {
    		if(options.register) {
    			parsedOptions.register = options.register;
    		}
    		if(options.evalStr) {
    			parsedOptions.evalStr = options.evalStr;
    		}
    		if(options.maxAttempts) {
    			parsedOptions.maxAttempts = options.maxAttempts;
    		}
    		if(options.delay) {
    			parsedOptions.delay = options.delay;
    		}
    		if(options.rejectOnError) {
    			parsedOptions.rejectOnError = options.rejectOnError;
    		}
    	}
    	return parsedOptions;
    }
    this.readAndEvaluate = function(options) {
    	// Create a promise object.
    	var defered = q.defer();

    	// Parse the user's options
    	var parsedOptions = parseReadAndEvaluateOptions(options);
    	/*
    	 * The general idea of how to execute strings is described in the
    	 * node.js vm docs:
    	 * https://nodejs.org/api/vm.html
    	 * ex:
    	var sandbox = {
    		'x': 0,
    	};
    	var context = new vm.createContext(sandbox);
    	var script = new vm.Script(evalStr);

    	var result = script.runInContext(context);
    	console.log('Script Result', result);
    	*/

    	// Create a valueChecker object.
    	var valueChecker = new createValueChecker(parsedOptions);
    	// Execute the value checker.
    	valueChecker.run(defered);

    	// Return the promise.
    	return defered.promise;
    };
    function getReadAndEvaluateOp(options) {
    	return function executeReadAndEvalOp() {
    		return self.readAndEvaluate(options);
    	};
    }

    function parseWREWriteOptions(options) {
    	var parsedOptions = {
    		'register': 'DAC0',
    		'value': 0,
    	};
    	if(options) {
    		if(options.register) {
    			parsedOptions.register = options.register;
    		}
    		if(options.value) {
    			parsedOptions.value = options.value;
    		}
    	}
    	return parsedOptions;
    }
    this.writeReadAndEvaluate = function(writeOptions, readOptions) {
    	// console.log('HERE', writeOptions, readOptions);
    	// var defered = q.defer();
    	var pWriteOptions = parseWREWriteOptions(writeOptions);
    	
    	return self.iWrite(pWriteOptions.register, pWriteOptions.value)
    	.then(getReadAndEvaluateOp(readOptions));
    	// .then(defered.resolve);
    	// .catch(defered.reject);
    	// return defered.promise;
    };
}

module.exports.get = createDeviceValueChecker;