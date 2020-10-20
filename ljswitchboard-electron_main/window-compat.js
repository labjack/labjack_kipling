const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const packageData = require('./package.json');

class NwFakeWindow {
    get() {
        return BrowserWindow.getFocusedWindow();
    }

    open(url) {
        console.log('NwFakeWindow.open', url);
        const windowData = packageData.window;
        const window = new BrowserWindow({
            width: windowData.width,
            height: windowData.height,
            'min-width': windowData.min_width,
            'min-height': windowData.min_height,
            resizable: windowData.resizable,
            title: windowData.title,
            icon: windowData.icon,
            frame: windowData.frame,
            webPreferences: {
                preload: `${__dirname}/preload.js`,
                nodeIntegration: true,
                enableRemoteModule: true,
                worldSafeExecuteJavaScript: true
            }
        });
        window.webContents.openDevTools();

        /*
                new BrowserWindow({

            });
        */

        window.loadURL(url);

        /*
            window.loadURL(url.format({
              pathname: path.join(__dirname, 'index.html'),
              protocol: 'file:',
              slashes: true
            }));
        */

        return window;
    }
}

exports.NwFakeWindow = NwFakeWindow;
