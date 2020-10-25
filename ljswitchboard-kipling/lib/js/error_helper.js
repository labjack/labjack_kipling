const ALERT_MESSAGE_SLIDE_TIME = 100;

global.hideAlert = function() {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
};

global.showAlert = function (message) {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message .error-display');

	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#alert-message .close').one('click', global.hideAlert);
	}
	setTimeout(global.hideAlert, 10000);
};

global.showAlertNoTimeout = function (message) {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message .error-display');

	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#alert-message .close').one('click', global.hideAlert);
	}
};

global.hideInfoMessage = function () {
	var alertMessageObj = $('#info-message');
	var alertMessageHolder = $('#info-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
};
global.showInfoMessage = function (message) {
	var alertMessageObj = $('#info-message');
	var alertMessageHolder = $('#info-message .error-display');

	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#info-message .close').one('click', global.hideInfoMessage);
	}
	setTimeout(global.hideInfoMessage, 5000);
};

global.showInfoMessageNoTimeout = function(message) {
	var alertMessageObj = $('#info-message');
	var alertMessageHolder = $('#info-message .error-display');

	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#info-message .close').one('click', global.hideInfoMessage);
	}
};

global.hideCriticalAlert = function() {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
};

global.showCriticalAlert = function(message) {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message .error-display');

	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#alert-error-message .close').one('click', hideCriticalAlert);
	}
};
