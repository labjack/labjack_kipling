
console.log('in tab_notification_manager.js', moduleData);

var notifications = {};
var q = global.require('q');


var getJQuerySelector = function(tabName, ext) {
	var selector = [
		'.module-chrome-tabs',
		' ',
		'#' + tabName + '-tab',

	].join('');
	if(ext) {
		selector += ' ';
		selector += ext;
	}
	return selector;
};
var clearMessages = function(updateData) {
	var defered = q.defer();
	updateData.badge.text('');
	defered.resolve(updateData);
	return defered.promise;
};
var getTitleText = function(tabName, num) {
	var baseText = ' Notification';
	if(num > 1) {
		baseText += 's';
	}

	return num.toString() + baseText;
};
var displayMessages = function(updateData) {
	var defered = q.defer();
	var numMessages = updateData.numMessages;
	var tabName = updateData.name;
	if(numMessages > 0) {
		var num = numMessages.toString();
		var titleText = getTitleText(tabName, numMessages);
		updateData.badge.text(numMessages.toString());
		updateData.badge.attr('title', titleText);
	}
	
	defered.resolve(updateData);
	return defered.promise;
};
var updateVisibleNotification = function(tabName) {
	var defered = q.defer();


	var tabMessages = [];
	if(notifications[tabName]) {
		tabMessages = notifications[tabName];
	}
	var badgeSelector = getJQuerySelector(tabName, '.badge');
	var tabSelector = getJQuerySelector(tabName, '#' + tabName);
	var updateData = {
		'name': tabName,
		'messages': tabMessages,
		'numMessages': tabMessages.length,
		'badgeSelector': badgeSelector,
		'tabSelector': tabSelector,
		'badge': $(badgeSelector),
		'tab': $(tabSelector),
	};
	clearMessages(updateData)
	.then(displayMessages)
	.then(defered.resolve);
	return defered.promise;
};

var updateVisibleNotifications = function() {
	var defered = q.defer();
	var tabNames = Object.keys(notifications);
	var promises = tabNames.map(updateVisibleNotification);
	
	// Wait for all tabs to be updated.
	q.allSettled(promises)
	.then(function() {
		defered.resolve();
	});
	return defered.promise;
};

var internalAddNotification = function(tabName, message) {
	if(notifications[tabName]) {
		notifications[tabName].push(message);
	} else {
		notifications[tabName] = [];
		notifications[tabName].push(message);
	}
};
var internalClearNotifications = function(tabName) {
	if(notifications[tabName]) {
		notifications[tabName] = null;
		notifications[tabName] = undefined;
		delete notifications[tabName];
	}
};



var initializeNotifications = function() {
	var initMessages = moduleData.startupData;
	var tabKeys = Object.keys(initMessages);
	tabKeys.forEach(function(tabKey) {
		initMessages[tabKey].forEach(function(message) {
			internalAddNotification(tabKey, message);
		});
	});
	updateVisibleNotifications();
};
initializeNotifications();


/**
 * Create an externally accessibal "addNotification" function that adds
 * notifications to be kept track of.
 */
this.addNotification = function(tabName, message) {
	internalAddNotification(tabName, message);
	return updateVisibleNotification(tabName);
};

this.addNotifications = function(tabName, messages) {
	messages.forEach(function(message) {
		internalAddNotification(tabName, message);
	});
	return updateVisibleNotification(tabName);
};

this.clearNotifications = function(tabName) {
	internalClearNotifications(tabName);
	return updateVisibleNotification(tabName);
};

this.setNotifications = function(tabName, messages) {
	internalClearNotifications(tabName);
	self.addNotifications(tabName, messages);
	return updateVisibleNotification(tabName);
};


/**
 * Create & add tab-change listener
 */
var updatedTabsListener = function(tabSections) {
	var sectionKes = Object.keys(tabSections);
	var numSections = tabSections.length;
	var promises = [];
	sectionKes.forEach(function(sectionKey) {
		// console.log('Tab section', sectionKey);
		tabSections[sectionKey].forEach(function(tab) {
			// console.log('Updating Tab', tab);
			var name = tab.name;
			var humanName = tab.humanName;
			promises.push(updateVisibleNotification(name));
		});
	});
	// Wait for all tabs to be updated.
	q.allSettled(promises)
	.then(function() {
		console.log('Updated Tab Notifications');
		defered.resolve();
	});
};
MODULE_CHROME.on(
	MODULE_CHROME.eventList.MODULE_TABS_UPDATED,
	updatedTabsListener
);

