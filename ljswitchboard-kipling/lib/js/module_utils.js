
var p = function(promiseFunc) {
	if(promiseFunc) {
		if(promiseFunc.then) {
			promiseFunc.then(function(res) {
				console.log('Result', res);
			}, function(err) {
				console.log('Error', err);
			});
		}
	}
};

var pr = function(result) {
	console.log('Result:', JSON.stringify(result, null, 2));
};
var pe = function(err) {
	console.log('Error:', JSON.stringify(err, null, 2));
};
var lr = function(result) {
	console.log('Result:', result);
};
var le = function(err) {
	console.log('Error:', err);
};

var CLEAR_CACHES = function() {
	var debugClearing = false;
	try {
		if(MODULE_CHROME) {
			if(debugClearing) {
				console.log('Clearing MODULE_CHROME cache');
			}
			MODULE_CHROME.clearTemplateCache();
		} else {
			if(debugClearing) {
				console.log('Not clearing MODULE_CHROME template cache');
			}
		}

		if(module_manager) {
			if(debugClearing) {
				console.log('Clearing module_manager cache');
			}
			module_manager.clearFileCache();
		} else {
			if(debugClearing) {
				console.log('Not clearing module_manager cache');
			}
		}

		if(fs_facade) {
			if(debugClearing) {
				console.log('Clearing fs_facade cache');
			}
			fs_facade.clearCache();
		} else {
			if(debugClearing) {
				console.log('Not clearing fs_facade cache');
			}
		}
	} catch(err) {
		if(debugClearing) {
			console.log('Caches did not get cleared');
		}
	}
};

var ENABLE_TASK_DEBUGGING = function() {
	TASK_LOADER.tasks.update_manager.vm.debug = true;
};
var DISABLE_TASK_DEBUGGING = function() {
	TASK_LOADER.tasks.update_manager.vm.debug = false;
};