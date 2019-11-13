
var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('TEST_OPENALL ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});

var testGroups = {
	'get_ljm_version': true,
	'openall': {
		'basic_mock': false,
		'mock_openall': false,
		'mock_w_device': false,
		'mock_scan_mix_mock_and_live_devices': false,
		'basic_test': true,
		'cached_scan_test': false,
		'basic_test-open_T4': false,
		'basic_eth_test': false,
		'multiple_sequential_scans': false,
		'usb_only_test': false,
		'open_all_device_scanner': false,
		'scan_with_device_shared': false,
		'handle_active_device_disconnected': false,
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
