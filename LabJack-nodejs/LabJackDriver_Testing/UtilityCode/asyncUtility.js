var functionLocationList = require('./functionList');
var list = functionLocationList.getList();

var functionList = [];
results = [];
var device = null;
var driver = null;
var numTests = 0;

var onTestError;
var onTestSuccess;

var startTime = 0;
var wait = false;
var runTime = 0;
var activeTest = 0;

var testComplete = true;

var pRes = false;
var pCmd = false;
var driver_const;

exports.config = function(dev, driv, constants) {
	device = dev;
	driver = driv;
	driver_const = constants;
};

var nextStep = function() {
	activeTest++;
	wait=false;
};
var onSuccess = function(res) {
	if(res != null) {
		results.push(res);
	} else {
		results.push('SUCCESS');
	}
	if(pRes) {
		if(res != null) {
			console.log(res);
		} else {
			console.log('Async-Success');
		}
	}
	nextStep();
};
var onError = function(erStr) {
	if(pRes) {
		console.log('ERROR: ',erStr);
	}
	results.push(erStr);
	nextStep();
};
var runTest = function() {
	if(activeTest < numTests) {
		//console.log('Running!');
		if(!wait) {
			var i = activeTest;
			var len = functionList[i].length;
			var funcName = functionList[i].split('(')[0]
			if(funcName == 'close'); {
				runTime = Date.now() - startTime;
			}
			if(functionList[i].slice(len-2, len)!='()') {
				if(funcName == 'open') {
					functionList[i] = functionList[i].replace(')', ',onError, onOpenSuccess)');
				} else {
					functionList[i] = functionList[i].replace(')', ',onError, onSuccess)');
				}
			} else {
				functionList[i] = functionList[i].replace(')', 'onError, onSuccess)');
			}
			

			//Execute test-function
			wait=true;
			if(pCmd) {
				console.log(list[funcName]+'.'+functionList[i]);
			}
			
			if(funcName == 'listAll') {
				eval(list[funcName]+'.'+functionList[i]);
			} else if(funcName == 'errToStr') {
				eval(list[funcName]+'.'+functionList[i]);
			} else {
				eval(list[funcName]+'.'+functionList[i]);
			}
			
		}
		if(!testComplete){
			setTimeout(runTest,process.nextTick);
		}
		//(typeof setImmediate != 'undefined' ? setImmediate : process.nextTick)(runTest)
	} else {
		testComplete = true;
		onTestSuccess({'time':runTime});
	}
}

exports.run = function(testList, onE, onS, printResults, printCommands) {
	numTests = testList.length
	functionList = testList;
	testComplete = false;
	onTestError = onE;
	onTestSuccess = onS;
	activeTest = 0;
	pRes = printResults;
	pCmd = printCommands;
	runTest();
};

exports.getResults = function() {
	return results;
};
exports.clearResults = function() {
	results = [];
}