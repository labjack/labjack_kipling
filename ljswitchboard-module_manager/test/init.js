// var path = require('path');
// var cwd = process.cwd();
// var pathPrepend = cwd + path.sep;
// var modulePaths = [
//     pathPrepend + '../',
//     pathPrepend + '../ljswitchboard-io_manager/lib/node_modules',
//     pathPrepend + '../ljswitchboard-io_manager/node_modules',
//     pathPrepend + '../ljswitchboard-package_loader/lib/node_modules',
//     pathPrepend + '../ljswitchboard-package_loader/node_modules',
// ];
//
// modulePaths.forEach(function(modulePath) {
//     var modulesDirToAdd = path.normalize(modulePath);
//     if (require.main.paths.indexOf(modulesDirToAdd) === -1) {
//         require.main.paths.splice(2,0, modulesDirToAdd);
//     }
// });
