exports.info = {
	'type': 'library'
};


var getHeaderModules = function() {
	return [{
		'name': 'TestA',
		'humanName': 'TestA'
	},{
		'name': 'TestB',
		'humanName': 'TestB'
	}];
};
exports.getHeaderModules = getHeaderModules;

var getConditionalModules = function(filters) {
	var modules = [];
	var i;
	for(i = 0; i < 10; i ++) {
		modules.push({
			'name': 'Test ' + i.toString(),
			'humanName': 'Test ' + i.toString(),
		});
	}
	return modules;
};
exports.getConditionalModules = getConditionalModules;

var getFooterModules = function() {
	return [{
		'name': 'TestA',
		'humanName': 'TestA'
	},{
		'name': 'TestB',
		'humanName': 'TestB'
	}];
};
exports.getFooterModules = getFooterModules;

