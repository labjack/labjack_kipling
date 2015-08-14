

var testGroups = {
	'basic_test': false,
	'config_loader': {
		'basic': false,
	},
	'config_checker': {
		'basic': false,
	},
	'device_data_collector': {
		'basic': false,
	},
	'data_group_manager': {
		'basic': true,
	},
	'data_collector': {
		'basic': false,
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
		console.log(' - Requiring test file', filePath);

		if(groupName) {
			exports[groupName] = require(filePath);
		} else {
			exports[testName] = require(filePath);
		}
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
