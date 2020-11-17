'use strict';

const path = require('path');
const {loadResources} = require('./resources');

function handleError(err, msg) {
	let reportError = true;
	if (err) {
		if (err.loadError) {
			reportError = false;
		}
	}
	return new Promise((resolve, reject) => {
		if (reportError) {
			console.error('Error on step', msg);
			reject({
				'loadError': true,
				'message': 'Error on step: ' + msg.toString(),
				'errorInfo': err,
			});
		} else {
			reject(reportError);
		}
	});
}

exports.info = {
	'type': 'nwApp',
	'main': 'lib/index.html'
};

exports.initializePackage = function (package_loader) {
	const window_manager = package_loader.getPackage('window_manager');

	console.log('Kipling initializePackage');
	const static_files = package_loader.getPackage('static_files');

	const moduleChromeTemplateName = path.resolve(__dirname, 'templates', 'module_chrome.html');
	const moduleChromeTabTemplateName = path.resolve(__dirname, 'templates', 'module_tab.html');

	window_manager.on(window_manager.eventList.OPENED_WINDOW, async (name) => {
		if (name !== 'kipling') return;

		const kiplingWindow = window_manager.getWindow('kipling');
		await window_manager.setWindowVariable('kipling', 'moduleChromeTemplateName', moduleChromeTemplateName);
		await window_manager.setWindowVariable('kipling', 'moduleChromeTabTemplateName', moduleChromeTabTemplateName);

		console.log('loadResources');
		await loadResources(kiplingWindow.win, static_files);
		console.log('/loadResources');
	});
};

