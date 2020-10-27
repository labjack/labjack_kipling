const electron = require('electron');
const getInjector = require('lj-di').getInjector;
const injector = getInjector({ electron });
global.lj_di_injector = injector;
global.handlebars = require('handlebars');
const package_loader = global.lj_di_injector.get('package_loader');
global.io_manager = package_loader.getPackage('io_manager');
global.module_manager = package_loader.getPackage('module_manager');
global.package_loader = package_loader;

console.log('preload');

window.addEventListener('message', (event) => {
}, false);

electron.ipcRenderer.on('postMessage', (event, data) => {
    const event2 = new CustomEvent(data.channel);
    event2.payload = data.payload;
    window.dispatchEvent(event2);
    // window.postMessage({type: data.channel, payload: data.payload}, '*');
});

