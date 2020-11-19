// Define the splash screen updater
class SplashScreenUpdater {

    constructor(splashWindow) {
        this.splashWindow = splashWindow;
    }

    update(message, level) {
        // this.splashWindow.webContents.send('splash_update', message);
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_update',
            'payload': {message, level},
        });
        console.log('Updating message to:', message, level);
    }

    finish(logPath) {
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_finish',
            'payload': logPath
        });
    }
}

exports.SplashScreenUpdater = SplashScreenUpdater;
