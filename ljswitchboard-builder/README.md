# ljswitchboard-builder
A repository dedicated to building and packing the ljswitchboard program.


## Summary

To build the project:

`npm run build_project`

## Not meant to be a dependency of any published labjack_kipling packages

Because ljswitchboard-builder contains large build files, it does not make itself available for the final Kipling app. For more, see [publish_locally](#publish_locally).

## test

### npm test

Currently, `npm run gather_project_files` must be run beforehand.

Tests functionality of build_scripts/file_operations.js.

## Build

The other build scripts operate on the core modules (defined in `ljswitchboard-builder/package.json['kipling_dependencies']`). If passed the argument `test`, many of the scripts also operate on `ljswitchboard-builder/package.json['kipling_test_dependencies']`.

### build_project

Calls other npm scripts in the proper order to build a distributable Kipling bundle for the current OS.

### prepare_build

Empties `output` build directory & copies NW files.

### publish_locally

To avoid hitting the npm registry, we can publish locally. Doing so allows us know reliably know that all labjack_kipling internal packages in the final build object are the most recent.

Primarily, the build is guaranteed to have only one version of each labjack_kipling internal package. This ensures everything in the final build is up-to-date.

Some related benefits:

 - No waiting for the npm registry to update
 - No worrying about the local npm cache being stale
 - Less network traffic is required, both outbound and inbound
 - We don't need the npm registry anymore.
 - The final build is comparatively smaller.

publish_locally.js copies staging versions of the labjack_kipling internal packages to `labjack_kipling/ljswitchboard-builder/temp_staging/`. Once there, it sets their labjack_kipling internal dependencies to be absolute paths in `labjack_kipling/ljswitchboard-builder/temp_staging/`.

From there it `npm pack`s labjack_kipling internal packages from `temp_staging` as tar files to:
`labjack_kipling/ljswitchboard-builder/temp_tar/`.

All contents of `temp_tar` and `temp_staging` will be deleted beforehand.

### gather_project_files

Deletes any previous files in `temp_project_files`, then recursively copies dirs defined in `ljswitchboard-builder/package.json['kipling_dependencies']` from `temp_staging` to `temp_project_files`, while omitting certain files and directories.

### gather_test_project_files

Same as `gather_project_files`, but also copies dirs defined in `ljswitchboard-builder/package.json['kipling_test_dependencies']`.

### edit_k3_startup_settings

Ensures that `ljswitchboard-electron_main/package.json` is ready for release.

### install_production_dependencies

Does two passes of installation.

For each package in `temp_project_files` (which come from `temp_staging`), installs their labjack_kipling internal dependencies from the tar packages in `temp_tar`.

Then recursively installs production `package.json['dependencies']` of each module defined in `ljswitchboard-builder/package.json['kipling_dependencies']`.

### rebuild_native_modules

Uses node-gyp to rebuild ffi and ref.

### clean_project

Deletes the files and folders in `temp_project_files` that are not necessary for distributed release bundle.

### organize_project_files

Compresses files from `temp_project_files` into .zip files in output. E.g.:

```
from: ljswitchboard-builder/temp_project_files/ljswitchboard-core
to  : ljswitchboard-builder/output/nwjs.app/Contents/Resources/ljswitchboard-core.zip
```

ljswitchboard-splash_screen is special since it is the starting point, e.g.:

```
from: ljswitchboard-builder/temp_project_files/ljswitchboard-splash_screen
to  : ljswitchboard-builder/output/nwjs.app/Contents/Resources/app.nw
```

### brand_project

Brands the package as Kipling (e.g. Kipling.app instead of nwjs.app).

### compress_output

Compresses the contents of `output` to something like `kipling.3.1.14.2018_07_05_mac64.zip`.
