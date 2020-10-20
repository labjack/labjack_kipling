const isNodeWebkit = Object.keys(process.versions).indexOf('node-webkit') >= 0;
const isElectron = Object.keys(process.versions).indexOf('electron') >= 0;
const isElectronMain = isElectron && !global.window;
const isElectronRenderer = isElectron && !isElectronMain;

class Injector {

    constructor(opts) {
        this.opts = opts;
        this.map = {};
    }

    get(name) {
        if (!this.map[name]) {
            if (isElectronRenderer) {
                const mainInjector = this.opts.electron.remote.getGlobal('lj_di_injector');
                if (mainInjector.has(name)) {
                    return mainInjector.get(name);
                    // console.log(mainInjector);
                }
            }

            throw new Error('Unknown injector key: '+name);
        }
        return this.map[name]();
    }

    has(name) {
        return !!this.map[name];
    }

    getAll() {
        return Object.assign({}, this.map);
    }

    bind(name, callback) {
        this.map[name] = callback;
    }

    bindSingleton(name, singleton) {
        return this.bind(name, () => singleton);
    }

}

let injector;
exports.getInjector = function (opts) {
    if (!injector) {
        injector = new Injector(opts);
    }

    return injector;
};
