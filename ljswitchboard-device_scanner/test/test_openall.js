
var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('TEST_OPENALL ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});

var testGroups = {
	'get_ljm_version': true,
	'openall': {
		'basic_mock': true,
		'mock_openall': true,
		'mock_w_device': true,
		'mock_scan_mix_mock_and_live_devices': true,
		'basic_test': true,
		'basic_test-open_T4': true,
		'basic_eth_test': true,
		'multiple_sequential_scans': true,
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
