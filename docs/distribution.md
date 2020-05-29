# Building Kipling for distribution

To build:
```bash
npm run setup
npm run build
```


## Building

labjack_kipling is comprised of many packages. [Lerna](https://github.com/lerna/lerna) is used to manage and publish them.

For a list of the packages, use lerna's [`list` command](https://github.com/lerna/lerna/tree/master/commands/list).

To publish packages use lerna's [`publish` command](https://github.com/lerna/lerna/tree/master/commands/publish).

Once packages have been published, the main Kipling version may be updated:

If steps of the above build process fail:

- Make sure the proper version of node.js is installed.  The ljswitchboard-io_manager has a node.js binary it is programmed to use.  Make sure the build computer has the same version as the io_manager. The node binary file is located in the folder ljswitchboard-io_manager/node_binaries.  These are just copies of the binaries from node.js.  Perhaps there is a better way to properly include these into a repository & link them to node itself; suggestions welcome.

- Old: Reinstall all dependencies. Run `npm run clean` to delete all packages' node_modules folders, then run `npm run setup` to re-install. This shouldn't be necessary anymore due to package-locks.

- Old: navigate into the ljswitchboard-builder directory and run "npm run build_project" to build the project.  The output files will exist in the /output folder.

