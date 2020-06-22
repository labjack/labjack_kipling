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

### quick_build_project

TODO: Document.

### prepare_build

Empties `output` build directory & copies NW files.

### gather_project_files

Deletes any previous files in `temp_project_files`, then recursively copies dirs defined in `ljswitchboard-builder/package.json['kipling_dependencies']` to `temp_project_files`, while omitting certain files and directories.

### gather_test_project_files

Same as `gather_project_files`, but also copies dirs defined in `ljswitchboard-builder/package.json['kipling_test_dependencies']`.

### edit_k3_startup_settings

Ensures that `ljswitchboard-splash_screen/package.json` is ready for release.

For the keys and values in `ljswitchboard-builder/package.json['splash_screen_build_keys']`, sets the corresponding keys and values in `ljswitchboard-splash_screen/package.json`. E.g. if ljswitchboard-builder/package.json['splash_screen_build_keys']['test'] is false, sets `ljswitchboard-splash_screen/package.json['test']` to false.

### publish_locally

Publishes all labjack_kipling packages besides ljswitchboard-builder as tar files to:
`labjack_kipling/ljswitchboard-builder/temp_publish/`
 
All contents of `temp_publish` will be deleted first. 

### install_production_dependencies

Does two passes of installation.

For each package in `temp_project_files`, installs their internal (labjack_kipling) dependencies from the tar packages in `temp_publish`.

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
