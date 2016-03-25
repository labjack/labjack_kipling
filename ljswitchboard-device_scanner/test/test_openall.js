
var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('TEST_OPENALL ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});

// // exports.unit_tests = require('./unit_tests').tests;
// exports.basic_test = require('./basic_test').tests;
// // exports.open_all_basic_test = require('./open_all_basic_test').tests;
// exports.mock_test = require('./mock_test').tests;
// exports.scan_connected_devices = require('./scan_connected_devices').tests;

// exports.crazy_test = require('./crazy_test').tests;

var testGroups = {
	'get_ljm_version': true,
	'listall': {
		'basic_test': false,
	},
	'openall': {
		'basic_mock': true,
		'mock_openall': true,
		'basic_test': true,
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
		console.log(' - Requiring test file'.green, filePath, groupName, testName);

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

	} else {
		console.log(' - Skipping Test:'.yellow, filePath);
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
