const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const packageData = require('./package.json');

class NwFakeWindow {
    get() {
        return BrowserWindow.getFocusedWindow();
    }

    open(url, windowData) {
        if (!windowData) {
            windowData = {};
        }

        const options = Object.assign({}, windowData, {
            webPreferences: Object.assign({}, windowData.webPreferences, {
                preload: `${__dirname}/preload.js`,
                nodeIntegration: true,
                enableRemoteModule: true,
                worldSafeExecuteJavaScript: true
            })
        });

        console.log('NwFakeWindow.open', url, options);

        const window = new BrowserWindow(options);
        window.webContents.openDevTools();

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
