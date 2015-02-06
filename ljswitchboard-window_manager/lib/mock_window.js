
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var eventList = {
	LOADED: 'loaded',
	CLOSE: 'close',
	CLOSED: 'closed',
	HIDDEN: 'hidden',
	SHOWN: 'shown'
};

var createNewWindow = function(options) {
	this.title = '';

	this.options = {};
	this.isVisible = false;
	if(typeof(options) !== 'undefined') {
		if(typeof(options.show) !== 'undefined') {
			this.options.show = options.show;
		} else {
			this.options.show = true;
		}
	} else {
		this.options.show = true;
	}
	this.isVisible = this.options.show;

	this.hide = function() {
		// console.log('mock_window_hidden');
		self.isVisible = false;
		self.emit(eventList.HIDDEN);
	};
	this.show = function() {
		// console.lg('mock_window_shown');
		self.isVisible = true;
		self.emit(eventList.SHOWN);
	};
	this.close = function(closeWindow) {
		if(closeWindow) {
			setImmediate(function() {
				self.emit(eventList.CLOSED);
			});
			
		} else {
			setImmediate(function() {
				self.emit(eventList.CLOSE);
			});
		}
	};
	var self = this;
};
util.inherits(createNewWindow, EventEmitter);

exports.eventList = eventList;
exports.open = function() {
	var newWindow = new createNewWindow();
	setTimeout(function() {
		// console.log('firing loaded event');
		newWindow.emit(eventList.LOADED);
	}, 200);
	return newWindow;
};