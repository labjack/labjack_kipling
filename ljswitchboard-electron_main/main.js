const electron = require('electron');
const path = require('path');
const url = require('url');

const {PackageLoader} = require('ljswitchboard-package_loader');
const {WindowManager} = require('ljswitchboard-window_manager');
const {NwFakeWindow} = require('./window-compat');

const getInjector = require('lj-di').getInjector;
const injector = getInjector({ electron });
global.lj_di_injector = injector;

const startDir = require('./get_cwd').startDir;
injector.bindSingleton('startDir', startDir);

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const packageData = require('./package.json');
const {SplashScreenUpdater} = require('./splash');
const {loadProgramPackages} = require('./packages-load');
injector.bind('package.json', packageData);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var splashWindow = null;

const fakeWindow = new NwFakeWindow();

const gui = {
  App: {
    manifest: packageData
  },
  Window: fakeWindow
};
global.gui = gui;
injector.bindSingleton('gui', gui);

// gui.App.manifest.test
/*
const win = {
  on(a, b) {
    console.log(a, b);
  }
};
*/

console.log('PackageLoader', PackageLoader);
const package_loader = new PackageLoader(injector);
injector.bindSingleton('package_loader', package_loader);

console.log('WindowManager', WindowManager);
const window_manager = new WindowManager();
window_manager.configure({
  'gui': gui
});
injector.bindSingleton('window_manager', window_manager);

// Add the -builder window to the window_manager to have it be managed.
var initialAppVisibility = false;
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
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.

  splashWindow = fakeWindow.open(url.format({
    pathname: path.join(__dirname, '..', 'ljswitchboard-electron_splash_screen', 'lib', 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

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
    loadProgramPackages(injector, splashScreenUpdater);
  });

  window_manager.addWindow({
    'name': 'main',
    'win': splashWindow,
    'initialVisibility': initialAppVisibility,
    'title': 'splashWindow'
  });

  splashWindow.webContents.openDevTools();
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (splashWindow === null) {
    createWindow();
  }
});
