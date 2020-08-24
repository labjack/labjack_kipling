# labjack_kipling

## Test commit

labjack_kipling is an graphical application for LabJack device configuration but is flexible enough to perform most LabJack device functionality. More information: [Kipling](https://labjack.com/support/software/applications/t-series/kipling). Kipling is powered by [nw.js](https://nwjs.io/).


## Development Setup

First, install the [LJM library](https://labjack.com/support/software/installers/ljm). Then:

```bash
git clone https://github.com/labjack/labjack_kipling
cd labjack_kipling
npm install
npm run setup # Installs npm modules using `lerna bootstrap`
npm start # Launches a development version of Kipling
```

For details and troubleshooting, see [docs/setup.md](https://github.com/labjack/labjack_kipling/blob/master/docs/setup.md).


## Development vs Distribution

Once successfully setup, Kipling can be launched "live" from the working directories. Alternately, it can be launched from a packaged build. The packaged build is what is distributed via the [LabJack installer](https://labjack.com/support/software/installers/ljm). Information on building Kipling for distribution is in [docs/distribution.md](https://github.com/labjack/labjack_kipling/blob/master/docs/distribution.md).


## Kipling Core modules:
Kipling's core submodules are the only ones that are strictly needed to launch Kipling. These core modules can be thought of as the entry point to Kipling's dependency tree -- they include other Kipling modules as npm dependencies. The core modules are:

```
ljswitchboard-splash_screen
ljswitchboard-core
ljswitchboard-io_manager
ljswitchboard-kipling
ljswitchboard-module_manager
ljswitchboard-static_files
```

## Commands:

There are two types of commands: npm run-scripts commands and grunt commands.

### npm Commands

To execute arbitrary commands on the submodules, you can use labjack_kipling/main.js. For more information, call `node main.js do -h`. See package.json for examples. To pass flags to main.js from `npm run`, use -- before your flags, e.g. to only do git status for core modules, do `npm run git_status -- --which=core`.

### Grunt

Run `grunt` to lint Kipling's code, including labjack_kipling's code. **In progress**


## Development


### <a name="test-mode"></a>Test Mode

To enter test mode, change `test` in labjack_kipling/ljswitchboard-splash_screen/package.json to true. This will:
 - Provide mock device connections
 - Disable the cache, so that essentially all you need to do make a change is to edit a file and reload the module by clicking on it again. (E.g. just click on the Settings module on the left side of the Kipling window.)
 - Uses the data folder `LabJack/K3_DEV` instead of `LabJack/K3`

