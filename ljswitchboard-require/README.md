#ljswitchboard-require

A special "require" extension developed for the [ljswitchboard](https://github.com/chrisJohn404/LabJack-nodejs) project aka ([Kipling](https://labjack.com/support/kipling)).  This project has a unique requirement where a single node-js process was split among multiple root directories.  The program needs to be stored in several "chunks" to run optimally therefore requiring the use of multiple "node_module" directories.  This project allows users to declare "root" directories that require would normally operate properly in and require the node_modules available in those directories.  

Essentially, this module calls the nodejs require function with a stored "n" number of additional paths that gets automatically appended to the require call once it is appropriately initialized.

To the list described on the node.js [modules](http://nodejs.org/api/modules.html)
describing [Loadinf from node_modules Folders](http://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders), ljswitchboard-require adds a customizable "n" number of additional directories to search in.

aka (mimicking the node.js example):
If the file at '/home/ry/projects/foo.js' called ljswitchboard-require.require('bar.js'), then node will essentially look in the following locations:

 * /home/ry/projects/node_modules/bar.js
 * /home/ry/node_modules/bar.js
 * /home/node_modules/bar.js
 * /node_modules/bar.js
 * /yourDirectory/bar.js
 * /process.cwd()/bar.js

 NOTE:
 The one flaw of this library as of right now is that require doesn't get executed from the path of the caller and I am not sure how it will perform when multiple modules start to use it.  The fix for this may be to switch to using rekuire instead of require but I am avoiding this right now for speed purposes.
