const electron = require('electron');
const getInjector = require('lj-di').getInjector;
const injector = getInjector({ electron });

console.log('preload');

window.addEventListener('message', (event) => {
}, false);

electron.ipcRenderer.on('postMessage', (event, data) => {
    const event2 = new CustomEvent(data.channel);
    event2.payload = data.payload;
    window.dispatchEvent(event2);
    // window.postMessage({type: data.channel, payload: data.payload}, '*');
});

global.lj_di_injector = injector;
