# LabJack Kipling internals

## Intro

The current version of LabJack is built using [ElectronJs](https://www.electronjs.org/).

Keep in mind that previously it's been using NwJs(https://nwjs.io/).
Some structures / functions were created during the port in order to make Kipling working without rewriting too much of its code.

## Project entry - electron_main

electron_main/main.js is the entry point of whole app.

It's a nodejs script which:

* starts electron
* creates nwjs compatibility layer 
* creates PackageLoader
* creates WindowManager
* opens splashWindow
* starts package splashScreenUpdater
* loads program packages

## Globals

Due to historical reasons kipling uses few globals. I tried to reduce its use but there are still few.

Main process and electron windows do not have common global space. It is similar to server/client browser/nodejs programming.
However, some globals are exposed to the windows, and they communicate to main process via `remote` mechanism. In most cases it is equivalent of calling those globals in main process.

Such globals are: 

* global.package_loader - you can use package_loader.getPackage to access packages without need to expose each package to global space
* global.gui - compatibility with NwJS: App, Shell, Window objects
* global.io_manager
* global.console - outputs to node console and log file

Each window is opened with prepending preload.js file. See it for the details. 

## WindowManager

Manage windows: open, closes, handles events.

## PackageLoader

It is responsible for extracting and loading packages.

```js
await package_loader.loadPackage({
    'name': 'static_files',
    'folderName': 'ljswitchboard-static_files',
    'loadMethod': 'managed',
    'forceRefresh': false,
    'directLoad': true,
    'locations': [
        // Add path to files for development purposes, out of a repo.
        path.join(__dirname, '..', '..', 'ljswitchboard-static_files'),

        // If those files aren't found, check the node_modules directory of
        // the current application for upgrades.
        // path.join(startDir, 'node_modules', 'ljswitchboard-static_files'),

        // If all fails, check the starting directory of the process for the
        // zipped files originally distributed with the application.
        path.join(startDir, 'resources', 'app', 'ljswitchboard-static_files.zip'),
        path.resolve(startDir, '..', 'Resources', 'app', 'ljswitchboard-static_files.zip'),
        path.join(startDir, 'ljswitchboard-static_files.zip')
    ]
});
```

It can also be used as a container for Dependency Injection.

```js
await package_loader.loadPackage({
    'name': 'manifest',
    'loadMethod': 'set',
    'ref': manifest
});
```

Once packages are loaded it tells WindowManager to close splashWindow and start managed packages.
In a result the ljswtichboard-kipling is started. 

TODO: write about core / secondary / managed packages

## ljswtichboard-kipling

It is a first package started by PackageManager.

Have a look at its structure:

package.json

```json
{
    "main": "./lib/ljswitchboard-kipling.js",
}
```

`main` value points to the main scripts `/lib/ljswitchboard-kipling.js` which is started my PackageManager

This script (`/lib/ljswitchboard-kipling.js`) export type of package and location of main html file
`initializePackage` is a custom code which is called by main electron process.
If you want to customize code loaded by window check the html file and locate the main browser js script. 

```js
exports.info = {
'type': 'nwApp',
'main': 'lib/index.html'
};
exports.initializePackage = async function (package_loader) {
};
```

See `_startPackage` for package loading details.
