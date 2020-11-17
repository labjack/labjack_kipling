console.log('in tab_notification_manager.js', moduleData);

const notifications = {};

var getJQuerySelector = function(tabName, ext) {
	var selector = [
		'.module-chrome-tabs',
		' ',
		'#' + tabName + '-tab',

	].join('');
	if (ext) {
		selector += ' ';
		selector += ext;
	}
	return selector;
};
var clearMessages = function(updateData) {
	updateData.badge.text('');
	return Promise.resolve(updateData);
};
var getTitleText = function(tabName, num) {
	var baseText = ' Notification';
	if (num > 1) {
		baseText += 's';
	}

	return num.toString() + baseText;
};
var displayMessages = function(updateData) {
	var numMessages = updateData.numMessages;
	var tabName = updateData.name;
	if (numMessages > 0) {
		var num = numMessages.toString();
		var titleText = getTitleText(tabName, numMessages);
		updateData.badge.text(numMessages.toString());
		updateData.badge.attr('title', titleText);
	}

	return Promise.resolve(updateData);
};
var updateVisibleNotification = function(tabName) {
	var tabMessages = [];
	if (notifications[tabName]) {
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

	return clearMessages(updateData)
		.then(displayMessages);
};

var updateVisibleNotifications = function() {
	const tabNames = Object.keys(notifications);
	const promises = tabNames.map(updateVisibleNotification);

	// Wait for all tabs to be updated.
	return Promise.allSettled(promises);
};

var internalAddNotification = function(tabName, message) {
	if (notifications[tabName]) {
		notifications[tabName].push(message);
	} else {
		notifications[tabName] = [];
		notifications[tabName].push(message);
	}
};
var internalClearNotifications = function(tabName) {
	if (notifications[tabName]) {
		notifications[tabName] = null;
		notifications[tabName] = undefined;
		delete notifications[tabName];
	}
};



var initializeNotifications = function() {
	// 5/12/2015: This isn't particularly useful...  I think it was just a test
	// of the startupData being available in tasks.
	// Add startup-messages.
	// if (moduleData.startupData) {
	//	var initMessages = moduleData.startupData.initialMessages;
	//	if (initMessages) {
	//		var tabKeys = Object.keys(initMessages);
	//		tabKeys.forEach(function(tabKey) {
	//			initMessages[tabKey].forEach(function(message) {
	//				internalAddNotification(tabKey, message);
	//			});
	//		});
	//	}
	// }

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

var self = this;

/**
 * Create & add tab-change listener
 */
var updatedTabsListener = function(tabSections) {
	var sectionKeys = Object.keys(tabSections);
	var numSections = tabSections.length;
	var promises = [];

	for (let sectionKey in tabSections) {
		const tabSection = tabSections[sectionKey];
		console.log('tabSection', tabSection);
		for (const tab of tabSection.context) {
			// console.log('Updating Tab', tab);
			var name = tab.name;
			var humanName = tab.humanName;
			promises.push(updateVisibleNotification(name));
		}
	}

	// Wait for all tabs to be updated.
	return Promise.allSettled(promises)
		.then(function() {
			console.log('Updated Tab Notifications');
		});
};
MODULE_CHROME.on(
	MODULE_CHROME.eventList.MODULE_TABS_UPDATED,
	updatedTabsListener
);

this.startTask = function(bundle) {
	// console.log('TAB_NOTIFIER_BUNDLE - bundle keys',Object.keys(bundle));
	// console.log('TAB_NOTIFIER_BUNDLE - bundle',bundle);
	return Promise.resolve(bundle);
};
