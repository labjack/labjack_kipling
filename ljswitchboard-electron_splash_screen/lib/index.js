/*
node-webkit 0.11.6 process.versions:
chromium: "38.0.2125.104"
http_parser: "2.2"
modules: "14"
node: "0.11.13-pre"
node-webkit: "0.11.6"
nw-commit-id: "ec3b4f4-d8ecacd-e5d35ef-f2f89e2-d9a9d39-cdd879e"
openssl: "1.0.1f"
uv: "0.11.22"
v8: "3.28.71.2"
zlib: "1.2.5"

nw 0.12.0-alpha2 process.versions:
chromium: "41.0.2236.2"
http_parser: "2.3"
modules: "14"
node: "1.0.0"
node-webkit: "0.12.0-alpha2"
nw-commit-id: "e0d5ce6-d017875-34492e5-2e978ac-1116f2c-fd87c8d"
openssl: "1.0.1j"
uv: "1.2.0"
v8: "3.31.31"
zlib: "1.2.5"
*/

window.addEventListener('splash_update', (event) => {
	console.log('88887778787',event);
	const message = event.payload;
	const titleTextObj = document.querySelector('.titleText');
	titleTextObj.textContent = message.toString();
});

const manifest = require('../package.json');

// // Add copy & paste support on mac
// if (process.platform === "darwin") {
//   var mb = new gui.Menu({type: 'menubar'});
//   mb.createMacBuiltin('Kipling', {
//     hideEdit: false,
//   });
//   gui.Window.get().menu = mb;
// }

// // Get an instance of the startup window
// var win = gui.Window.get();

// perform other requires

const electron = require('electron');
const getInjector = require('lj-di').getInjector;
const injector = getInjector({ electron });

const window_manager = injector.get('window_manager');
console.log('window_manager', window_manager);

if(false) {
// Perform a switch based on if this is a test or not.
	const gui = injector.get('gui');
if(!!process.env.TEST_MODE || manifest.test) {
	// If set to 'test', perform testing code

	// Load the testing window
	// win.window.location = './test/test_ljswitchboard.html';
	console.log('This is a test, starting test window');
	var test_ljswitchboard = gui.Window.open('test_index.html', {
		position: 'center',
		width: 900,
		height: 900
	});

	test_ljswitchboard.on('closed', function() {
		// win = null;
	});

	// Detect when a user closes the test_window
	test_ljswitchboard.on('close', function() {
		// Hide the test_ljswitchboard window for improved user feedback.
		this.hide();

		if(win !== null) {
			// Also close the startup window
			win.close(true);
		}

		// After closing the main window, close the test_ljswitchboard window
		this.close(true);
	});
	win.on('close', function() {
		console.log('Close captured');
		// Hide the startup window for improved user feedback.
		this.hide();

		// If the test_ljswitchboard window is still open then close it.
		if(test_ljswitchboard !== null) {
			test_ljswitchboard.close(true);
		}

		// After closing the startup window, close the test_ljswitchboard.
		this.close(true);
	});

} else {
	// If this isn't a test then start ljswitchboard
	// var start_ljswitchboard = require('./lib/start_ljswitchboard');
}

}

