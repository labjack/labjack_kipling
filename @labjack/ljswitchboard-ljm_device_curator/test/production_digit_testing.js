var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});

console.log('Welcome to the Digit Production Test!'.green);
var testing_messages = [
	'You need to run this test 2-3 times and need to manually verify the test results.'.green,
	'1. Check for reasonable humidity readings (not -10) ~25-40 is pretty reasonable.'.green,
	'2. Make sure the Lux values change when you cover up/expose them to light.'.green,
	' - Reasonable "room" luxes are ~1k, ~10-500 for closed.  More for direct light.'.green,
	'3. Check for reasonable temps, ~26.'.green,
];
testing_messages.forEach(function(message) {
	console.log(message);
});
console.log('Beginning Test:'.green);
console.log();



var testGroups = {
	'get_ljm_version': true,
	'mock_device': {
		'mock_device_test': false,
		'mock_device_defaults_cache_test': false,
		'mock_device_attrs_test': false,
		'mock_device_upgrade_test': false,
		'multiple_mock_device_upgrade_test': false,
	},
	'digit': {
		'digit_basic_test': false,
		'digit_variance_testing': true,
	},

};


var fileNameBase = './';

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
