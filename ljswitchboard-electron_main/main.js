const electron = require('electron');
const path = require('path');
const url = require('url');

const {PackageLoader} = require('ljswitchboard-package_loader');
const {WindowManager} = require('ljswitchboard-window_manager');
const {NwFakeWindow} = require('./window-compat');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.

const packageData = require('./package.json');
const {SplashScreenUpdater} = require('./splash');
const {loadProgramPackages} = require('./packages-load');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let splashWindow = null;

const fakeWindow = new NwFakeWindow();

const gui = {
  App: {
    manifest: packageData,
    quit() {
      console.log('@TODO: quit');
    }
  },
  Shell: {
    openExternal(url) {
      return electron.shell.openExternal(url);
    }
  },
  Window: fakeWindow
};
global.gui = gui;

// gui.App.manifest.test
/*
const win = {
  on(a, b) {
    console.log(a, b);
  }
};
*/


const buildOS = {
  'darwin': 'darwin',
  'win32': 'win32'
}[process.platform] || 'linux';

const localK3FilesPath = {
  win32: 'C:\\ProgramData\\LabJack\\K3',
  darwin: '/usr/local/share/LabJack/K3',
  linux:  '/usr/local/share/LabJack/K3',
}[buildOS];


const np_sep = (process.platform === 'win32') ? ';' : ':';
process.env.NODE_PATH = path.join(__dirname, 'node_modules') + np_sep +
    path.resolve(__dirname, '..') + np_sep +
    path.join(localK3FilesPath, 'ljswitchboard-io_manager', 'node_modules') + np_sep +
    path.join(localK3FilesPath, 'ljswitchboard-kipling', 'node_modules');
require('module').Module._initPaths();

const package_loader = new PackageLoader();
global.package_loader = package_loader;
package_loader.loadPackage({
  'name': 'gui',
  'loadMethod': 'set',
  'ref': gui
});

const window_manager = new WindowManager();
package_loader.loadPackage({
  'name': 'window_manager',
  'loadMethod': 'set',
  'ref': window_manager
});

window_manager.configure({
  'gui': gui
});

// Add the -builder window to the window_manager to have it be managed.
let initialAppVisibility = false;
if(packageData.window.show) {
  initialAppVisibility = true;
}


// Attach to the "Quitting Application" event
window_manager.on(window_manager.eventList.QUITTING_APPLICATION, function() {
  console.log('Quitting Application');
  gui.App.quit();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.

  const appData = require('./package.json');
  const newWindowData = appData.window ? appData.window : {};

  splashWindow = fakeWindow.open(
      url.format({
        pathname: path.join(__dirname, 'node_modules', 'ljswitchboard-electron_splash_screen', 'lib', 'index.html'),
        protocol: 'file:',
        slashes: true
      }),
      Object.assign({}, newWindowData, {
        webPreferences: {
        additionalArguments: [
          '--packageName=' + 'ljswitchboard-electron_splash_screen'
        ]
      }
    })
  );

  /*
    splashWindow.on('did-finish-load', (event) => {
      console.log('did-finish-load', event);
    });
  */

  // console.log('Displaying Splash-Screen', packageData);

  // and load the index.html of the app.

  // Open the DevTools.

  // Emitted when the window is closed.
  splashWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    splashWindow = null;
  });

  splashWindow.webContents.once('dom-ready', () => {
    console.log('splashWindow::loaded');
    const splashScreenUpdater = new SplashScreenUpdater(splashWindow);

    package_loader.loadPackage({
      'name': 'splashScreenUpdater',
      'loadMethod': 'set',
      'ref': splashScreenUpdater
    });
    loadProgramPackages(package_loader, splashScreenUpdater);
  });

  window_manager.addWindow({
    'name': 'main',
    'win': splashWindow,
    'initialVisibility': initialAppVisibility,
    'title': 'splashWindow'
  });

  if (process.env.NODE_ENV === 'development') {
    splashWindow.webContents.openDevTools();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (splashWindow === null) {
    createWindow();
  }
});
