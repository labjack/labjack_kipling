
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
	try {
		if(MODULE_CHROME) {
			console.log('Clearing MODULE_CHROME cache');
			MODULE_CHROME.clearTemplateCache();
		} else {
			console.log('Not clearing MODULE_CHROME template cache');
		}

		if(module_manager) {
			console.log('Clearing module_manager cache');
			module_manager.clearFileCache();
		} else {
			console.log('Not clearing module_manager cache');
		}

		if(fs_facade) {
			console.log('Clearing fs_facade cache');
			fs_facade.clearCache();
		} else {
			console.log('Not clearing fs_facade cache');
		}
	} catch(err) {
		console.log('Caches did not get cleared');
	}
}