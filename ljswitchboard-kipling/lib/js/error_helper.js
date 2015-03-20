

function hideAlert() {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message #error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp();
}

function showAlert(message) {
	var alertMessageObj = $('#alert-message');
	var alertMessageHolder = $('#alert-message #error-display');
	
	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown();
		$('#alert-message .close').one('click', hideAlert);
	}
	setTimeout(hideAlert, 5000);
}

function hideCriticalAlert() {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message #error-display');
	alertMessageHolder.html('');
	alertMessageObj.slideUp();
}
function showCriticalAlert(message) {
	var alertMessageObj = $('#alert-error-message');
	var alertMessageHolder = $('#alert-error-message #error-display');
	
	alertMessageHolder.html(message);
	if(alertMessageObj.css('display') === 'none') {
		alertMessageObj.slideDown();
		$('#alert-error-message .close').one('click', hideCriticalAlert);
	}
}