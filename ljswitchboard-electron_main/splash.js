// Define the splash screen updater
class SplashScreenUpdater {

    constructor(splashWindow) {
        this.splashWindow = splashWindow;
    }

    update(message) {
        // this.splashWindow.webContents.send('splash_update', message);
        this.splashWindow.webContents.postMessage('postMessage', {
            'channel': 'splash_update',
            'payload': message
        });
        console.log('Updating message to:', message);
    }
}

exports.SplashScreenUpdater = SplashScreenUpdater;
