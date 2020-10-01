Removed old stuff:

* `/kipling-cli` dir
* `Old stuff` dir
* `ljswitchboard-server`
* old_dependencies from package.json from several submodules
* test-old.js


* labjack_t4_upgrade - Not Needed, see tseries:
* labjack_t7_upgrade - Not Needed, see tseries , check 

* module `device_updater` removed - not working, outdated by `device_updater_fw`

Updated:

* nodeunit no longer maintained (https://www.npmjs.com/package/nodeunit) generates tons of `retire` warnings. It was replaced with mocha/chai

NOT UPDATED (to be updated after nwjs upgrade or switch to electron):

* cheerio - waiting for 1.0.0.rc-4 - https://github.com/cheeriojs/cheerio/issues/1476
* node-fetch - more recent version not working with nw.js
* mocha@7.2.0 - more recent version not working with nw.js
* ffi-napi@2.4.6 - more recent version not working with nw.js
 
TODO:

Check LabJack-nodejs test scripts in package.json
test simple_logger
check package_loader tests
Curator - what are production line test?

Remove this.skip(); from tests where possible

