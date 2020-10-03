var assert = require('chai').assert;

var module_manager = require('../lib/ljswitchboard-module_manager');

var testModuleCategoryResult = function(assert, modules) {
	try {
	assert.isOk(
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
			assert.isOk(exists, 'Required Key not found: ' + requiredKey);
		});
	});
} catch(err) {
	console.log('Error in testModuleCategoryResult', err, err.stack);
}
};

describe('module listing', function() {
	it('getModulesList', function (done) {
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
			assert.deepEqual(foundCategories, requiredCategories, msg);
			foundCategories.forEach(function(categoryKey) {
				testModuleCategoryResult(assert, moduleGroups[categoryKey]);
			});
			done();
		});
	});
	it('getHeaderModules', function (done) {
		module_manager.getHeaderModules()
		.then(function(headerModules) {
			testModuleCategoryResult(assert, headerModules);
			done();
		});
	});
	it('getBodyModules', function (done) {
		module_manager.getBodyModules()
		.then(function(bodyModules) {
			testModuleCategoryResult(assert, bodyModules);
			done();
		});
	});
	it('getFooterModules', function (done) {
		module_manager.getFooterModules()
		.then(function(footerModules) {
			testModuleCategoryResult(assert, footerModules);
			done();
		});
	});
	it('getTaskModules', function (done) {
		module_manager.getTaskList()
		.then(function(tasks) {
			testModuleCategoryResult(assert, tasks);
			done();
		});
	});
	it('filterBodyModules', function (done) {
		done();
	});
});
