console.info('preload start');

const electron = require('electron');

console.log('NODE_PATH', process.env.NODE_PATH);
require('module').Module._initPaths(); // Fix node_modules path

process.argv.forEach(arg => {
    if (arg.startsWith('--packageName=')) {
        global.packageName = arg.substr('--packageName='.length);
    }
});

console.log("global.packageName:", global.packageName);

for (const level of ['log', 'error', 'warn', 'info', 'verbose', 'debug', 'silly']) {
    global.console['_' + level] = global.console[level];
    global.console[level] = (...args) => {
        global.console['_' + level](...args);
        const mainLogger = electron.remote.getGlobal('mainLogger');
        const now = new Date();

        let initiator = '';
        if (level !== 'info') {
            try {
                throw new Error();
            } catch (e) {
                if (typeof e.stack === 'string') {
                    let isFirst = true;
                    for (const line of e.stack.split('\n')) {
                        const matches = line.match(/^\s+at\s+(.*)/);
                        if (matches) {
                            if (!isFirst) { // first line - current function
                                // second line - caller (what we are looking for)
                                initiator = matches[1];
                                break;
                            }
                            isFirst = false;
                        }
                    }
                }
            }
        }

        function filterArgs(arg, level) {
            if (typeof arg === 'object') {
                if (arg in HTMLElement) {
                    return '[instanceof HTMLElement]';
                }
                if (arg instanceof Node) {
                    return '[instanceof Node]';
                }
                if (level === 'error') {
                    return JSON.stringify(arg, null, 2);
                }
                return JSON.stringify(arg).substr(0, 40);
            }
            return arg;
        }

        mainLogger.browserOutput({
            now,
            level,
            data: args.map(arg => filterArgs(arg, level)),
            source: global.packageName + (initiator ? ':' + initiator : '')
        });
    };
}

const package_loader = electron.remote.getGlobal('package_loader');
global.package_loader = package_loader;
global.gui = package_loader.getPackage('gui');

if (-1 === ['ljswitchboard-electron_splash_screen'].indexOf(global.packageName)) {
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
