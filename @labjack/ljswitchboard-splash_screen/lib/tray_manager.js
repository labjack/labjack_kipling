

function createTrayManager() {

	// Create a tray object
	var tray = new gui.Tray({
		'title': gui.App.manifest.window.title,
		'tooltip': gui.App.manifest.window.title,
		'icon': gui.App.manifest.window.icon
	});

	// Give it a menu
	var trayMenu = new gui.Menu();
	trayMenu.append(new gui.MenuItem({
			type: 'normal',
			label: 'Show Main Screen',
			click: function() {
				global.ljswitchboard.win.show();
			}
		}));
	trayMenu.append(new gui.MenuItem({
			type: 'separator',
			label: 'box1'
		}));
	trayMenu.append(new gui.MenuItem({
			type: 'normal',
			label: 'Quit Kipling',
			click: function() {
				console.log('Quitting Kipling');
				global.ljswitchboard.gui.App.quit();
			}
		}));
	tray.menu = trayMenu;

	// Attach to the generic click
	tray.on('click', function(data) {
		console.log('Detected Tray Click!', data);
		global.ljswitchboard.win.show();
	});

	// Save the tray object to the global scope
	global.ljswitchboard.tray = tray;

	var self = this;
}

exports.createTrayManager = createTrayManager;