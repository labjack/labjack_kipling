/*
 * This file is in charge of aggregating collected data so that it doesn't
 * cause view refreshes to happen super frequently.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

var view_type_manager = require('./view_type_manager');

var events = {};
exports.events = events;

function print() {
	var dataToPrint = [];
	dataToPrint.push('(view_data_reporter.js)');
	for(var i = 0; i < arguments.length; i++) {
		dataToPrint.push(arguments[i]);
	}
	console.log.apply(console, dataToPrint);
}

function CREATE_VIEW_DATA_REPORTER() {
	
	this.config = undefined;

	// This object will get initialized with each data_group's name
	// and the views that need to be updated when data for that data_group
	// arrives.
	// ex: this.groupEndpoints.basic_group = ['basic_view', 'view_2'];
	this.groupEndpoints = {};

	// This object will get initialized with each view's data.
	/*
		"basic_graph" type example
		y axis: the value
		x axis: index
		data format requirement: Data has to be represented as a #.
	   	ex: this.viewData.basic_view = {
		   	'name':"Basic Graph",
		   	'view_type':"basic_graph",
		   	'window_size':5,
		   	"group": "basic_data_group",
	   	}

	   	"current_values" type example
	   	ex: this.viewData.current_values_view = {
			'name':"Current Values",
		   	'view_type':"current_values",
		   	'window_size':1, Note: This does not need to be defined, it should be forced to 1
		   	"group": "basic_data_group",
	   	}
	*/
	this.viewData = {};

	/*
	This array is filled with data that allows the new group data to be
	quickly cleaned of data that should not be sent to the view.  It only has
	enabled data points in it.
	*/
	this.dataMap = {};

	function initializeViewData() {
		var data_groups = self.config.data_groups;
		var views = self.config.views;

		// Initialize the groupEndpoints and viewData variables.
		self.groupEndpoints = undefined;
		self.groupEndpoints = {};
		self.viewData = undefined;
		self.viewData = {};
		self.dataMap = undefined;
		self.dataMap = {};

		// Save each view to the viewData object & initialize any necessary
		// variables.
		views.forEach(function(view_key) {
			var view_data = self.config[view_key];

			var window_size = view_type_manager.getWindowSize(view_data);

			// Initialize the data cache.  The cache is optomized for flot so it
			// will just be a two dimensional array. Data will be stored in the
			// order that they are defined.
			var data_cache;
			if(view_data.view_type === 'basic_graph') {
				data_cache = [];
			} else if(view_data.view_type === 'current_values') {
				data_cache = {};
			} else {
				data_cache = [];
			}

			self.viewData[view_key] = {
				'name': view_data.name,
				'view_type': view_data.view_type,
				'window_size': window_size,
				'group': view_data.group,
				'data_cache': data_cache,
			}

			// Add the view key to the groupEndpoints variable
			if(self.groupEndpoints[view_data.group]) {
				self.groupEndpoints[view_data.group].push(view_key)
			} else {
				self.groupEndpoints[view_data.group] = [view_key];
			}
		});

		data_groups.forEach(function(group_key) {
			var groupData = self.config[group_key];

			// Initialize the group_key index array.
			self.dataMap[group_key] = [];

			var serial_numbers = groupData.device_serial_numbers;
			serial_numbers.forEach(function(serial_number) {
				var deviceData = groupData[serial_number];
				deviceData.registers.forEach(function(register) {
					var isEnabled = register.enable_view;
					if(isEnabled) {
						self.dataMap[group_key].push({
							'key': serial_number, // Data is organized by serial number
							'type': 'dev_val',
							'val_key': register.name
						});
					}
				});
			});

			var user_values = groupData.defined_user_values;
			user_values.forEach(function(user_value_key) {
				var userValue = groupData.user_values[user_value_key];
				var isEnabled = userValue.enable_view;
				if(isEnabled) {
					self.dataMap[group_key].push({
						'key': 'userValues', // Data is located under the key 'userValues'
						'type': 'user_val',
						'val_key': userValue.name
					});
				}
			});
		});
	}
	function innerConfigureViewDataReporter(config) {
		var defered = q.defer();

		// Save the loaded configuration
		self.config = config;

		// Initialize the viewData object.
		try {
			initializeViewData();
		} catch(err) {
			print('Error...', err, err.stack);
		}
		print('in innerConfigureViewDataReporter');
		defered.resolve(config);
		return defered.promise;
	}

	function innerUnconfigureViewDataReporter(bundle) {
		var defered = q.defer();
		print('in innerUnconfigureViewDataReporter');
		defered.resolve(bundle);
		return defered.promise;
	}

	function innerStartViewDataReporter(bundle) {
		var defered = q.defer();
		print('in innerStartViewDataReporter');
		defered.resolve(bundle);
		return defered.promise;
	}

	function innerStopViewDataReporter(bundle) {
		var defered = q.defer();
		print('in innerStopViewDataReporter');
		defered.resolve(bundle);
		return defered.promise;
	}

	function filterGroupData(data, dataMap) {
		var dataArray = [];
		var dataKeyValueStore = {};

		dataMap.map(function(data_info) {
			var currentData = data[data_info.key];
			var data_type = data_info.type;
			var val_key = data_info.val_key;
			var newVal = 0;
			if(data_type === 'dev_val') {
				var valObj = currentData.results[val_key];
				newVal = valObj.result
			} else if(data_type === 'user_val') {
				newVal = currentData[val_key]
			}

			dataArray.push(newVal);
			if(dataKeyValueStore[data_info.key]) {
				dataKeyValueStore[data_info.key][val_key] = newVal;
			} else {
				dataKeyValueStore[data_info.key] = {};
				dataKeyValueStore[data_info.key][val_key] = newVal;
			}
		});
		return {'dataArray': dataArray, 'keyValueStore': dataKeyValueStore};
	}
	function manageBasicGraphData(dataArray, view) {
		var numSaved = view.data_cache.length;

		// Determine how to save the new data point.
		if(numSaved < view.window_size) {
			// Shift in the new data point.
			view.data_cache.push(dataArray);
		} else {
			// Un-shift the old data point.
			view.data_cache.shift();

			// Shift in the new data point.
			view.data_cache.push(dataArray);
		}
	}
	function manageCurrentValuesData(keyValueStore, view) {
		// Throw out the old data by defining the data_cache to be undefined
		view.data_cache = undefined;

		// Save the keyValueStore as the latest data in the data_cache.
		view.data_cache = keyValueStore;
	}
	function manageNewData(data) {
		print('Managing Data', data.groupKey);

		var filteredData = filterGroupData(
			data.data,
			self.dataMap[data.groupKey]
		);
		print(filteredData);

		var endpoint_keys = self.groupEndpoints[data.groupKey];
		endpoint_keys.forEach(function(endpoint_key) {
			// Data in the endpoint...
			// self.viewData[view_key] = {
			// 	'name': view_data.name,
			// 	'view_type': view_data.view_type,
			// 	'window_size': window_size,
			// 	'group': view_data.group,
			// 	'data_cache': data_cache,
			// }
			var view = self.viewData[endpoint_key];

			// Determine what type of view we are working with
			if(view.view_type === 'basic_graph') {
				manageBasicGraphData(filteredData.dataArray, view);
			} else if(view.view_type === 'current_values') {
				manageCurrentValuesData(filteredData.keyValueStore, view);
			}
		});
	}
	/* Externally Accessable functions */
	this.onNewData = function(data) {
		// print('New Data');
		// Determine if the data group key is one that should be managed.
		var dataGroupKey = data.groupKey
		if(self.groupEndpoints[data.groupKey]) {
			try {
				manageNewData(data)
			} catch(err) {
				print('Error managing data', err, err.stack);
			}
		} else {
			print('Not Managing Data', data.groupKey);
		}
	};
	this.configure = function(bundle) {
		return innerConfigureViewDataReporter(bundle);
	};
	this.unconfigure = function(bundle) {
		return innerUnconfigureViewDataReporter(bundle);
	};
	this.start = function(bundle) {
		return innerStartViewDataReporter(bundle);
	};
	this.stop = function(bundle) {
		return innerStopViewDataReporter(bundle);
	};
	var self = this;
}

util.inherits(CREATE_VIEW_DATA_REPORTER, EventEmitter);

exports.create = function() {
	return new CREATE_VIEW_DATA_REPORTER();
};