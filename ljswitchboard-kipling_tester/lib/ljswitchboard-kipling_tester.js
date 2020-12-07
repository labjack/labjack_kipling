const {runTests} = require('./run_tests');
const { screen } = require('electron');

function loadCoreResources(win, static_files, resources) {
	return static_files.loadResources(win, resources)
		.catch(function(err) {
			console.error('Error Loading resources', err);
		});
}

async function loadResources(win, static_files) {
	console.log('Loading Page Resources');

	// Resources located in the -static_files directory
	const resourceList = [
		// CSS for bootstrap
		'libs/bootstrap/css/bootstrap.docs.min.css',
		'libs/bootstrap/css/bootstrap.min.css',

		// CSS for bootmetro
		'libs/bootmetro/css/bootmetro.min.css',
		'libs/bootmetro/css/bootmetro-icons.min.css',
		'libs/bootmetro/css/bootmetro-responsive.min.css',
		'libs/bootmetro/css/bootmetro-ui-light.min.css',

		// CSS for fixes to bootmetro & bootstrap
		'css/bootmetro.fix.css',

		// CSS for fixes to bootmetro & bootstrap
		'css/bootmetro.fix.css',

		// CSS for the switchboard base
		'css/switchboard_base.css',

		// CSS for the kipling_tester
		'css/kipling_tester.css',

		// ------------------ Require js files -----------------------//
		// JS for jQuery
		'libs/jquery/jquery-1.10.2.min.js',

		// JS for bootmetro
		'libs/bootmetro/js/bootmetro.min.js',

		// JS for bootstrap
		'libs/bootstrap/js/bootstrap.min.js',

		// custom jquery ui stuff
		'libs/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.min.js',
	];

	return loadCoreResources(win, static_files, resourceList);
}

exports.info = {
	'type': 'nwApp',
	'main': 'lib/index.html'
};

exports.startPackage = async function (package_loader) {
	const window_manager = package_loader.getPackage('window_manager');
	const static_files = package_loader.getPackage('static_files');

	window_manager.showWindow('kipling_tester');
	const kiplingTesterWindow = window_manager.getWindow('kipling_tester');

	const { width, height } = screen.getPrimaryDisplay().workAreaSize;
	const winHeight = height - 35;
	const winWidth = width / 2;
	const testWinPos = 0;
	const kiplingWinPos = winWidth;

	kiplingTesterWindow.win.setBounds({ x: testWinPos, y: 0, width: winWidth - 300, height: winHeight });

	const managedKiplingWindow = window_manager.getWindow('kipling');
	let kiplingWin = managedKiplingWindow.win;
	kiplingWin.setBounds({ x: kiplingWinPos-300, y: 0, width: winWidth + 300, height: winHeight });
	// kiplingWin.closeDevTools();
	kiplingTesterWindow.win.focus();

	await loadResources(kiplingTesterWindow.win, static_files);
	await runTests(window_manager, package_loader);
};
