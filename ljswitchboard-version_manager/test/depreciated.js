var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});

// Thermocouple Tests
// exports.t7_thermocouple_speed_test = t7_thermocouple_speed_test.tests;

// Perform Digit related tests
// exports.digit_basic_test = digit_basic_test.tests;
// exports.digit_variance_testing = digit_variance_testing.tests;

// Register Watcher tests
// exports.basic_watcher_test = basic_watcher_test.tests;


// var device_curator = require('../../lib/device_curator');
// var utils = require('../utils/utils');

var testGroups = {
	'basic_test': true,
	't7_test': true,
	't4_test': true,
};


var fileNameBase = './';

var cmds = [
'npm run get_t4',
'npm run get_t7',
];
console.log('For debugging information, run the following commands:'.green);
cmds.forEach(function(cmd) {
	console.log(cmd.green);
});
console.log('');

function requireTest(groupName, fileNamePartials, isEnabled, destObj) {
	var filePath = '';
	var i;
	var testName = '';
	filePath += fileNameBase;
	if(groupName) {
		if(groupName !== '') {
			filePath += groupName + '/';
		}
	}

	testName += fileNamePartials[0];
	for(i = 1; i < fileNamePartials.length; i ++) {
		testName += '_' + fileNamePartials[i];
	}
	filePath += testName;

	if(isEnabled) {
		console.log(' - Requiring test file', filePath, groupName, testName);

		var basicGroupName = 'test';
		if(groupName) {
			if(groupName !== '') {
				basicGroupName = groupName;
			}
		}
		if(typeof(exports[basicGroupName]) === 'undefined') {
			exports[basicGroupName] = {};
		}
		exports[basicGroupName][testName] = require(filePath);
		// if(groupName !== '') {
		// 	exports[groupName] = require(filePath);
		// } else {
		// 	exports[testName] = require(filePath);
		// }
	} else {
		console.log(' - Skipping Test:', filePath);
	}
}

var groupKeys = Object.keys(testGroups);
groupKeys.forEach(function(groupKey) {
	var testGroup = testGroups[groupKey];

	// For each test group check to see if they are a test or loop through their
	// group contents.
	if(typeof(testGroup) === 'boolean') {
		requireTest('', [groupKey], testGroup, exports);
	} else {
		var testKeys = Object.keys(testGroup);
		testKeys.forEach(function(testKey) {
			// For each test in a group, require enabled tests.
			var test = testGroup[testKey];
			requireTest(groupKey, [testKey], test, exports);
		});
	}
});
