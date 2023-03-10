var ref = require('ref-napi');

AVAILABLE_FUNCTIONS = {
	'LJM_eWriteAddressesAsync':
	[
		{name: 'handle', strategy: 'notUndefined'},
		{name: 'length', strategy: 'number'},
		{name: 'addresses', strategy: 'uint'},
		{name: 'types', strategy: 'uint'},
		{name: 'values', strategy: 'double'},
		{name: 'error', strategy: 'length'},
		{name: 'callback', strategy: 'type'}
	],
	'LJM_eWriteAddresses':
	[
		{name: 'handle', strategy: 'notUndefined'},
		{name: 'length', strategy: 'number'},
		{name: 'addresses', strategy: 'uint'},
		{name: 'types', strategy: 'uint'},
		{name: 'values', strategy: 'double'},
		{name: 'error', strategy: 'length'}
	],
	'LJM_eWriteNamesAsync':
	[
		{name: 'handle', strategy: 'notUndefined'},
		{name: 'length', strategy: 'number'},
		{name: 'names', strategy: 'stringArray'},
		{name: 'values', strategy: 'double'},
		{name: 'error', strategy: 'length'},
		{name: 'callback', strategy: 'type'}
	],
	'LJM_eWriteNames':
	[
		{name: 'handle', strategy: 'notUndefined'},
		{name: 'length', strategy: 'number'},
		{name: 'names', strategy: 'stringArray'},
		{name: 'values', strategy: 'double'},
		{name: 'error', strategy: 'length'}
	]
};

VERIFICATION_STRATEGIES = {
	'notUndefined': function(test, expected, actual) { test.notStrictEqual(typeof(actual), 'undefined'); },
	'number': function(test, expected, actual) { assert.equal(actual, expected); },
	'uint': function(test, expected, actual) { bufferEqualsArray(test, expected, actual, actual.readUInt32LE, 4); },
	'double': function(test, expected, actual) { bufferEqualsArray(test, expected, actual, actual.readDoubleLE, 8); },
	'length': function(test, expected, actual) { assert.equal(expected, actual.length); },
	'stringArray': function(test, expected, actual) { cPointerEqualsArray(test, expected, actual); },
	'type': function(test, expected, actual) { test.notStrictEqual(typeof(actual), expected); }
};

function bufferEqualsArray(test, expected, actual, bufFunc, valueSizeInBytes) {
	//Expected = buffer imput from argList
	//actual = normal number-array defined by test code
	for(var i = 0; i< expected.length; i++) {
		assert.equal(bufFunc.call(actual, i*valueSizeInBytes),expected[i]);
	}
}
var POINTER_LENGTH = {
	'ia32': 4,
	'x64': 8,
	'arm': 4, // NOT SURE IF THIS IS CORRECT!!
}[process.arch];
if(process.arch === 'arm') {
	console.error('!!! Warning: Not sure if string pointers are 4 bytes or 8 bytes!!!');
}

function cPointerEqualsArray(test, expected, actual) {
	for(var i = 0; i < expected.length; i++) {
		var namePtr = ref.readPointer(actual, i*POINTER_LENGTH, 50);
		assert.strictEqual(ref.readCString(namePtr,0),expected[i], 'Failed to check argument string');
	}
}

exports.createCallSequenceChecker = function (expectedFunctionNames, expectedParamDict) {

	var getNextExpectedParam = function (paramName) {
		return expectedParamDict[paramName].shift();
	};

	var createCallChecker = function (functionName) {
		var functionParams = AVAILABLE_FUNCTIONS[functionName];

		return function (test, calledFunctionName, passedArgs) {
			var paramInfo;
			var nextFunctionName;
			var numFunctionParams;
			var strategyName;
			var strategy;

			nextFunctionName = expectedFunctionNames.shift();
			if(nextFunctionName !== null)
				assert.equal(nextFunctionName, calledFunctionName);

			numFunctionParams = functionParams.length;
			for (var i=0; i<numFunctionParams; i++) {
				paramInfo = functionParams[i];
				expectedValue = getNextExpectedParam(paramInfo.name);
				strategyName = paramInfo.strategy;
				strategy = VERIFICATION_STRATEGIES[strategyName];
				strategy(test, expectedValue, passedArgs[i]);
			}
		};
	};

	var callCheckers = expectedFunctionNames.map(function (e) { return createCallChecker(e); });

	return function (test, calledFunctionNames, passedArgsVector) {
		try {
			var numCallCheckers = callCheckers.length;

			for (var i=0; i<numCallCheckers; i++) {
				callCheckers[i](test, calledFunctionNames[i], passedArgsVector[i]);
			}
		} catch(err) {
			console.log('Error Checking...', err);
		}
	};
};
