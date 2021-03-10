const electron = require('electron');
const path = require('path');
const url = require('url');

const {PackageLoader} = require('ljswitchboard-package_loader');
const {WindowManager} = require('ljswitchboard-window_manager');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.

const packageData = require('./package.json');
const {SplashScreenUpdater} = require('./lib/splash');
const {loadProgramPackages} = require('./lib/packages-load');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let splashWindow = null;

const gui = {
  clipboard: {
    readText(type) {
      return electron.clipboard.readText(type);
    },
    writeText(text, type) {
      return electron.clipboard.writeText(text, type);
    },
    clear() {
      return electron.clipboard.clear();
    }
  },
  openDevTools() {
    console.log('openDevTools');
    electron.BrowserWindow.getFocusedWindow().maximize();
    electron.BrowserWindow.getFocusedWindow().openDevTools();
  },
  async openWindow(url, windowData) {
    if (!windowData) {
      windowData = {};
    }

    const options = Object.assign({}, windowData, {
      webPreferences: Object.assign({}, windowData.webPreferences, {
        preload: `${__dirname}/lib/preload.js`,
        nodeIntegration: true,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true
      })
    });

    const window = new electron.BrowserWindow(options);
    await window.loadURL(url);

    return window;
  },
  appManifest: packageData,
  quitApp() {
    app.quit();
  },
  Shell: {
    openExternal(url) {
      return electron.shell.openExternal(url);
    }
  }
};
global.gui = gui;

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

const window_manager = new WindowManager();
window_manager.configure({
  'gui': gui
});

async function createWindow() {
  // Create the browser window.

  await package_loader.loadPackage({
    'name': 'gui',
    'loadMethod': 'set',
    'ref': gui
  });

  await package_loader.loadPackage({
    'name': 'window_manager',
    'loadMethod': 'set',
    'ref': window_manager
  });

  // WORKAROUND: https://github.com/electron-userland/electron-webpack/issues/239
  const appName = 'kipling';
  electron.app.setName(appName);
  const appDataPath = app.getPath('appData');
  electron.app.setPath('userData', path.join(appDataPath, appName));

  require('./lib/error-handling');

  console.info('NodeJS version: ' + process.version);
  console.info('Electron version: ' + process.versions['electron']);
  console.info('Kipling version: ' + packageData.version);
  if (packageData.build_number) {
    console.info('Kipling build: ' + packageData.build_number);
  }

  const pacakgeInfo = require('./package.json');
  const newWindowData = pacakgeInfo.window ? pacakgeInfo.window : {};

  console.log('splashWindow');
  splashWindow = await gui.openWindow(
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

  // await new Promise(resolve => window.webContents.once('dom-ready', resolve));

  const splashScreenUpdater = new SplashScreenUpdater(splashWindow);
  await package_loader.loadPackage({
    'name': 'splashScreenUpdater',
    'loadMethod': 'set',
    'ref': splashScreenUpdater
  });

  window_manager.addWindow({
    'name': 'splash',
    'win': splashWindow,
    'title': 'splashWindow'
  });

  splashScreenUpdater.update('NodeJS version: ' + process.version, 'info');
  splashScreenUpdater.update('Electron version: ' + process.versions['electron'], 'info');
  splashScreenUpdater.update('Kipling version: ' + packageData.version, 'info');
  if (packageData.build_number) {
    splashScreenUpdater.update('Kipling build: ' + packageData.build_number);
  }

  await new Promise(resolve => setTimeout(resolve, 20));

  try {
    await loadProgramPackages(package_loader);

    splashScreenUpdater.update('Finished', 'info');
  } catch (err) {
    console.error(err);
    splashScreenUpdater.update(err, 'fail');
  } finally {
    splashScreenUpdater.finish(global.mainLogger.getLogFilePath());
    await window_manager.openPackageWindow(package_loader.getPackage('kipling'));
    window_manager.closeWindow('splash');
    window_manager.showWindow('kipling');
  }

  // window_manager.closeWindow('')

  if (package_loader.hasPackage('kipling_tester')) {
    const kipling_tester = package_loader.getPackage('kipling_tester');
    await window_manager.openPackageWindow(kipling_tester);
    await kipling_tester.startPackage(package_loader);
  }

}

app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});

app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (splashWindow === null) {
    await createWindow();
  }
});
