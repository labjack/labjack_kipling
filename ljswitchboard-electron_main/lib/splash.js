'use strict';

class SplashScreenUpdater {

    constructor(splashWindow) {
        this.splashWindow = splashWindow;
        splashWindow.on('closed', () => {
            this.splashWindow = null;
        });
    }

    update(message, level) {
        if (!this.splashWindow) return;

        if (Object.prototype.toString.call(message) === '[object Object]') {
            message = JSON.stringify(message);
        }

        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_update',
            'payload': {message, level},
        });
    }

    finish(logPath) {
        if (!this.splashWindow) return;
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_finish',
            'payload': logPath
        });
    }
}

exports.SplashScreenUpdater = SplashScreenUpdater;
