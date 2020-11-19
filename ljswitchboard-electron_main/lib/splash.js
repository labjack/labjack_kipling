'use strict';

class SplashScreenUpdater {

    constructor(splashWindow) {
        this.splashWindow = splashWindow;
    }

    update(message, level) {
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_update',
            'payload': {message, level},
        });
    }

    finish(logPath) {
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_finish',
            'payload': logPath
        });
    }
}

exports.SplashScreenUpdater = SplashScreenUpdater;
