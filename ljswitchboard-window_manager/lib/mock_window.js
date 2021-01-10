const EventEmitter = require('events').EventEmitter;

const eventList = {
	LOADED: 'loaded',
	CLOSE: 'close',
	CLOSED: 'closed',
	HIDDEN: 'hidden',
	SHOWN: 'shown'
};

class MockWindow extends EventEmitter {
	constructor(options) {
		super(options);

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
	}

	hide() {
		// console.log('mock_window_hidden');
		this.isVisible = false;
		this.emit(eventList.HIDDEN, this);
	}

	show() {
		// console.lg('mock_window_shown');
		this.isVisible = true;
		this.emit(eventList.SHOWN, this);
	}

	close(closeWindow) {
		if(closeWindow) {
			setImmediate(() => {
				this.emit(eventList.CLOSED, this);
			});
			
		} else {
			setImmediate(() => {
				this.emit(eventList.CLOSE, this);
			});
		}
	}
}

exports.eventList = eventList;
exports.open = function() {
	const newWindow = new MockWindow();
	setTimeout(function() {
		// console.log('firing loaded event');
		newWindow.emit(eventList.LOADED, newWindow);
	}, 200);
	return newWindow;
};
