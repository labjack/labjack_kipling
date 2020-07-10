

var q = require('q');
var module_manager = require('../lib/ljswitchboard-module_manager');

var testModuleResult = function(test, modules) {

};
var testModuleCategoryResult = function(test, modules) {
	try {
	test.ok(
		Array.isArray(modules),
		'Category should be an array'
	);
	modules.forEach(function(module) {
		var keys = Object.keys(module);
		var requiredKeys = [
			'name',
			'humanName',
			'data',
			'category',
		];
		requiredKeys.forEach(function(requiredKey) {
			var exists = false;
			if(keys.indexOf(requiredKey) >= 0) {
				exists = true;
			}
			test.ok(exists, 'Required Key not found: ' + requiredKey);
		});
	});
} catch(err) {
	console.log('Error in testModuleCategoryResult', err, err.stack);
}
};
var tests = {
	'getModulesList': function(test) {
		module_manager.getModulesList()
		.then(function(moduleGroups) {
			// console.log('Data', moduleGroups);
			var requiredCategories = [
				'header',
				'body',
				'footer'
			];
			var foundCategories = Object.keys(moduleGroups);
			var msg = 'Required module categories not found';
			test.deepEqual(foundCategories, requiredCategories, msg);
			foundCategories.forEach(function(categoryKey) {
				testModuleCategoryResult(test, moduleGroups[categoryKey]);
			});
			test.done();
		});
	},
	'getHeaderModules': function(test) {
		module_manager.getHeaderModules()
		.then(function(headerModules) {
			testModuleCategoryResult(test, headerModules);
			test.done();
		});
	},
	'getBodyModules': function(test) {
		module_manager.getBodyModules()
		.then(function(bodyModules) {
			testModuleCategoryResult(test, bodyModules);
			test.done();
		});
	},
	'getFooterModules': function(test) {
		module_manager.getFooterModules()
		.then(function(footerModules) {
			testModuleCategoryResult(test, footerModules);
			test.done();
		});
	},
	'getTaskModules': function(test) {
		module_manager.getTaskList()
		.then(function(tasks) {
			testModuleCategoryResult(test, tasks);
			test.done();
		});
	},
	'filterBodyModules': function(test) {
		test.done();
	},
};

exports.tests = tests;