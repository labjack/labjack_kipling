
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

/* Helper functions to take screen shots */

/* Resize window to a standard size */
var RESIZE_WINDOW_FOR_SCREENSHOTS = function() {
	var width = 1200;
	var height = 900;
	var k3Win = window_manager.windowManager.managedWindows.kipling.win.window;
	k3Win.resizeTo(width, height);
};

var TAKE_SCREENSHOT = function(name_prefix, name_append, callback) {
	var name = '';
	if(typeof(name_prefix) !== 'undefined') {
		name = name_prefix.toString();
	}
	var convertNumToStr = function(num) {
		var str = '';
		str = num.toString();
		while(str.length < 3) {
			str = '0' + str;
		}
		return str;
	};
	var getModuleOrder = function(humanName) {
		var moduleTabs = $('.module-chrome-tab-link');
		var moduleIndex = 999;

		for(i = 0; i < moduleTabs.length; i++) {
			var tabName = moduleTabs.eq(i).find('span').text();
			if(tabName === humanName) {
				moduleIndex = i;
				break;
			}
		}
		return convertNumToStr(moduleIndex);
	};

	var current_module = MODULE_LOADER.current_module_data.humanName;
	name += getModuleOrder(current_module);
	name += '_';
	name += current_module.split(' ').join('_').toLowerCase();

	if(typeof(name_append) !== 'undefined') {
		name += '-' + name_append.toString();
	}

	win.capturePage(function(img) {
		var base64Data = img.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
		require("fs").writeFile(
			"c:/Users/chris/kipling_screen_shots/" + name.toString() + ".png",
			base64Data,
			'base64',
			function(err) { 
				if(err) { 
					alert(err);
				}
				if(typeof(callback) === 'function') {
					callback();
				}
			}
		);
	},'png');
};

var TAKE_SCREENSHOTS = function() {
	var convertNumToStr = function(num) {
		var str = '';
		str = num.toString();
		while(str.length < 3) {
			str = '0' + str;
		}
		return str;
	};
	var moduleTabs = $('.module-chrome-tab-link');
	var elements = [];
	for(i = 0; i < moduleTabs.length; i++) {
		elements.push(moduleTabs.eq(i));
	}

	var startTime = new Date();
	var currentNum = 0;
	async.eachSeries(
		elements,
		function(element, callback) {
			MODULE_LOADER.once('MODULE_READY', function(res) {
				setTimeout(function() {
					console.log('Taking Screen Shot...', currentNum);
					TAKE_SCREENSHOT(undefined, undefined, callback);
					currentNum += 1;
				}, 2000);
			});
			element.trigger('click');
		},
		function(err) {
			var stopTime = new Date();
			var duration = ((stopTime - startTime)/1000).toFixed(3);
			console.log('Finished Taking Screen Shots', duration);
		});
	
};

function CLIPBOARD_FUNCTION_WRAPPER() {
	var nw = require('nw.gui');
	var clipboard = nw.Clipboard.get();
	function get() {
		return clipboard.get('text');
	};
	function set(txt) {
		clipboard.set(txt,'text');
	};
	function clear(){
		clipboard.clear();
	}
	this.get = get;
	this.set = set;
	this.clear = clear;
}
var CLIPBOARD_MANAGER = new CLIPBOARD_FUNCTION_WRAPPER();