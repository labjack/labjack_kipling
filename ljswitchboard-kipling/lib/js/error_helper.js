
var ALERT_MESSAGE_SLIDE_TIME = 100;
function hideAlert() {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
}

function showAlert(message) {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message .error-display');
	
	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#alert-message .close').one('click', hideAlert);
	}
	setTimeout(hideAlert, 5000);
}

function hideInfoMessage() {
	var alertMessageObj = $('#info-message');
	var alertMessageHolder = $('#info-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
}
function showInfoMessage(message) {
	var alertMessageObj = $('#info-message');
	var alertMessageHolder = $('#info-message .error-display');
	
	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#info-message .close').one('click', hideAlert);
	}
	setTimeout(hideInfoMessage, 2000);
}

function hideCriticalAlert() {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message .error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp(ALERT_MESSAGE_SLIDE_TIME);
}
function showCriticalAlert(message) {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message .error-display');
	
	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown(ALERT_MESSAGE_SLIDE_TIME);
		$('#alert-error-message .close').one('click', hideCriticalAlert);
	}
}
