window.addEventListener('splash_update', (event) => {
	const {message, level} = event.payload;
	const progressTextElement = document.querySelector('.progress-text');
	const stepResult = document.createElement('div');
	stepResult.innerText = message;
	if (level) {
		stepResult.classList.add(level);
	}
	if ('fail' === level) {
		progressTextElement.failed = true;
	}
	progressTextElement.appendChild(stepResult);

	const scrollHeight = Math.max(progressTextElement.scrollHeight, progressTextElement.clientHeight);
	progressTextElement.scrollTop = scrollHeight - progressTextElement.clientHeight;
});

window.addEventListener('splash_finish', (event) => {
	const progressTextElement = document.querySelector('.progress-text');
	const logPath = event.payload;
	if (progressTextElement.failed) {
		if (logPath) {
			const stepResult = document.createElement('div');
			stepResult.innerText = 'Detailed log can be found here: ';
			const link = document.createElement('a');
			link.setAttribute('href', 'file://' + logPath);
			link.setAttribute('target', '_blank');
			link.innerText = logPath;
			link.addEventListener('click', (event) => {
				event.stopPropagation();
				event.preventDefault();
				const shell = require('electron').shell;
				shell.openExternal('file://' + logPath);
			});

			stepResult.appendChild(link);
			progressTextElement.appendChild(stepResult);
		}

		progressTextElement.classList.add('finished');
		progressTextElement.classList.add('failed');
	}
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

// const electron = require('electron');
const package_loader = global.package_loader;
const window_manager = package_loader.getPackage('window_manager');
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
