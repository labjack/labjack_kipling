Removed old stuff:

* `/kipling-cli` dir
* `Old stuff` dir
* `ljswitchboard-server`
* old_dependencies from package.json from several submodules
* test-old.js

Updated:

* nodeunit no longer maintained (https://www.npmjs.com/package/nodeunit) generates tons of `retire` warnings. It was replaced with mocha/chai

TODO:

Check LabJack-nodejs test scripts in package.json
test simple_logger
check package_loader tests
Curator - what are production line test?

Remove this.skip(); from tests where possible
