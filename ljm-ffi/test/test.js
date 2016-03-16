var colors = require('colors');
process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


var testGroups = {
	'test_type_helpers': true,
	'get_ljm_version': true,
	'basic_ljm_calls': false,
	'ljm_calls': {
		'ljm_calls': false,
		'open_all': true,
	},
	'ljm_config_testing': {
		'special_addresses': false,
	},
	'device_opening': {
		'usb_connections': false,
		'udp_connections': false,
	},

	// This test should be run last because it switches to a potentially old version of the
	// LJM library.
	'load_specific_ljm': false,
	// 'config_loader': {
	// 	'basic': false,
	// },
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
		// if(groupName !== '') {
		// 	exports[groupName] = require(filePath);
		// } else {
		// 	exports[testName] = require(filePath);
		// }
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
