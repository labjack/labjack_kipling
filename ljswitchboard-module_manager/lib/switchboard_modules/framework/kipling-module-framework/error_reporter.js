

function createSingleDeviceFrameworkErrorReporter () {
	var pageSelector = '#single-device-framework-obj #device-view';
	this.loadError = function(message) {
		console.error('Display Error', message);
	};

	var self = this;
}
var SD_ERROR_REPORTER = new createSingleDeviceFrameworkErrorReporter();

