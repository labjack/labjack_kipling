
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var resources = {};
var jqueryElements = {};
var createJQuery = function(itemName) {
	var resource = [];
	this.savedItemName = itemName;

	if(resources[itemName]) {
		resource = resources[itemName];
	} else {
		// Deal with creating data...
		if(itemName[0] === '<') {
			// For simplicity, if the first character looks like it will be 
			// trying to create data then create it.
			this.internalData = [itemName];
		} else {
			// Because we don't really have a "DOM", just create the element
			// if it doesn't already exist.
			resources[itemName] = [];
			resources.isVisible = true;
		}
	}
	var isDefined = function(typeStr) {
		var res = false;
		if((typeStr !== 'undefined') && (typeStr !== 'null')) {
			res = true;
		}
		return res;
	};


	var internalSlideFunc = function(time, callback) {
		var timeType = typeof(time);
		var callbackType = typeof(callback);
		if(resources[itemName]) {
			if(resources[itemName].isVisible) {
				resources[itemName].isVisible = false;
			} else {
				resources[itemName].isVisible = true;
			}
			if((timeType !== 'undefined') && (callbackType !== 'undefined')) {
				setTimeout(function() {
					if(callbackType === 'function') {
						callback();
					}
				}, time);
			} else if((timeType !== 'undefined') && (callbackType === 'undefined')) {

				setTimeout(function() {
					if(timeType === 'function') {
						time();
					}
				}, 400);
			} else {
				console.log('mock_jquery.js slideFunc - Missing Case');
			}
			return resources[itemName];
		} else {
			return [];
		}
	};
	this.slideDown = function(time, callback) {
		return internalSlideFunc(time, callback);
	};
	this.slideUp = function(time, callback) {
		return internalSlideFunc(time, callback);
	};

	this.empty = function() {
		if(resources[itemName]) {
			resources[itemName] = [];
		} else {
			return [];
		}
	};
	this.append = function(data) {
		if(resources[itemName]) {
			resources[itemName].push(data);
			callCallback('ready');
			return resources[itemName];
		} else {
			resources[itemName] = [data];
			callCallback('ready');
			return resources[itemName];
		}
	};
	this.html = function(data) {
		if(data) {
			resources[itemName] = [data];
			return resources[itemName];
		} else {
			return resources[itemName];
		}
	};


	this.callbacks = {};
	var callCallback = function(name, data) {
		if(self.callbacks[name]) {
			if(typeof(self.callbacks[name]) === 'function') {
				self.callbacks[name](data);
			}
		}
	};
	this.ready = function(readyCallback) {
		self.callbacks.ready = readyCallback;
	};
	var getOnCallback = function(name, data, callback) {
		var onCallback = function() {
			if(typeof(callback) === 'function') {
				callback({'name': name, 'data': data});
			}
		};
		return onCallback;
	};
	this.on = function(events, selector, data, handler) {
		var addEventCallbacks = function(innerEvents, innerData, innerHandler) {
			var splitEvents = innerEvents.split(' ');
			splitEvents.forEach(function(innerEvent) {
				self.callbacks[innerEvent] = getOnCallback(
					innerEvent,
					innerData,
					innerHandler
				);
			});
		};
		var eventsType = typeof(events);
		var selectorType = typeof(selector);
		var dataType = typeof(data);
		var handlerType = typeof(handler);

		var isEventsTypeDefined = isDefined(eventsType);
		var isSelectorTypeDefined = isDefined(selectorType);
		var isDataTypeDefined = isDefined(dataType);
		var isHandlerTypeDefined = isDefined(handlerType);

		if(isEventsTypeDefined && isSelectorTypeDefined && isDataTypeDefined && isHandlerTypeDefined) {
			// The case when all 4 args are defined
			addEventCallbacks(events, data, handler);
		} else if(isEventsTypeDefined && isSelectorTypeDefined && isDataTypeDefined) {
			// The case when the selector is missing
			// Treat the selector obj as the data, and the data object as the handler
			addEventCallbacks(events, selector, data);
		} else if(isEventsTypeDefined && isSelectorTypeDefined) {
			// The case when the selector and data are missing
			addEventCallbacks(events, undefined, selector);
		}
	};
	this.trigger = function(name) {
		if(self.callbacks[name]) {
			if(typeof(self.callbacks[name]) === 'function') {
				self.callbacks[name]();
			}
		}
	};

	this.jquery = this;
	var self = this;
	return this;
};
// util.inherits(createJQuery, EventEmitter);

exports.jquery = function(itemName) {
	if(jqueryElements[itemName]) {
		return jqueryElements[itemName];
	} else {
		var newEl = new createJQuery(itemName);
		jqueryElements[itemName] = newEl;
		return newEl;
	}
};
exports.getResources = function() {
	return resources;
};