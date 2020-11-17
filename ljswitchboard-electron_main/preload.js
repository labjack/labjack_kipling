console.info('preload start');

console.log('NODE_PATH', process.env.NODE_PATH);
require('module').Module._initPaths(); // Fix node_modules path

process.argv.forEach(arg => {
    if (arg.startsWith('--packageName=')) {
        global.packageName = arg.substr('--packageName='.length);
    }
});
console.log("global.packageName:", global.packageName);

const electron = require('electron');
const package_loader = electron.remote.getGlobal('package_loader');
global.package_loader = package_loader;
global.gui = package_loader.getPackage('gui');

if (-1 === ['ljswitchboard-electron_splash_screen', 'core'].indexOf(global.packageName)) {
    global.handlebars = require('handlebars');
    global.ljmmm_parse = require('ljmmm-parse');
}

window.addEventListener('message', (event) => {
}, false);

electron.ipcRenderer.on('postMessage', (event, data) => {
    const event2 = new CustomEvent(data.channel);
    event2.payload = data.payload;
    window.dispatchEvent(event2);
    // window.postMessage({type: data.channel, payload: data.payload}, '*');
});

console.info('preload end');
