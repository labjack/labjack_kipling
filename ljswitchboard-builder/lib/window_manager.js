

function createWindowManager(mainWindow) {
	this.mainWindow = mainWindow;

	mainWindow.on('close', function() {
		var hideWindow = false;
		if(global.ljswitchboard) {
			if(global.ljswitchboard.tray) {
				hideWindow = true;
			}
		}

		if(hideWindow) {
			mainWindow.hide();
		} else {
			this.close(true);
		}
	});
	this.managedWindows = [];
	this.addWindow = function(windowName) {
		console.log('New Window Opened', windowName);
		self.managedWindows.push(windowName);

		console.log(Object.keys(global.ljswitchboard[windowName]));
		console.log(Object.keys(global.ljswitchboard[windowName].win));
		global.ljswitchboard[windowName].win.on('loaded', function() {
			// Set the window's title
			var win = global.ljswitchboard[windowName];
			if(win.data) {
				if(win.data.window) {
					if(win.data.window.title) {
						win.win.title = win.data.window.title;
					}
				}
			}
			console.log('Finished Loading Window', this.title);
		});
		global.ljswitchboard[windowName].win.on('close', function() {
			console.log('Closing Window...', this.title);
			this.close(true);
		});
		global.ljswitchboard[windowName].win.on('closed', function() {
			console.log('Closed Window...', this.title);
		});
	};
	var self = this;
}

exports.createWindowManager = createWindowManager;

