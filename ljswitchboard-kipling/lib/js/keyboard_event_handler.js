'use strict';

/**
 * keyboard_event_handler.js for LabJack Switchboard.  Provides Kipling
 * and all modules with a unified & error-safe way to respond to user keyboard
 * events.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

const gui = global.gui;

const path = require('path');
// const decache = require('decache');

const esc_KEY     = 27;
const equ_KEY    = 187;
const minus_KEY   = 189;
const c_KEY       = 67;
const f_KEY       = 78;
const q_KEY       = 81;
const r_KEY       = 82;
const s_KEY       = 83;
const w_KEY       = 87;

/**
 * keyboardEventHandler is an object that allows easy window-wide keypress
 * handling.  Initialize object at the start of the program.
 * @return {[type]} [description]
**/
class KeyboardEventHandler {

    constructor() {
        this.reloading = false;
        this.performUpgrade = false;

        this.specialElements = [
            {
                "className": "escapableInput typeahead tt-input",
                "func": (info, newText) => {
                    $('.escapableInput.typeahead.tt-input').val(newText);
                }
            }
        ];

        this.lastOnFocusEvent = null;
        this.lastOnFocusElementValue = '';
        this.lastOnFocusElementID = '';
        this.lastOnFocusElementClassName = '';
        this.lastOnFocusElementKey = '';

        this.numInputListeners = 0;

        this.primaryKeysList = [esc_KEY, minus_KEY, equ_KEY, c_KEY, f_KEY,
            q_KEY, r_KEY, s_KEY, w_KEY];

        this.keysList = [
            {   // escape key
                'name':'esc',
                'key':'esc',
                'platforms':['mac','win','linux'],
                'func': this.handleEscapeKey,
                'listeners': new Map()
            },{ // keypress to open debugging console
                'name':'openConsole',
                'key':'ctrl+alt+shift+c',
                'platforms':['mac','win','linux'],
                'func': this.handleOpenConsole,
                'listeners': new Map()
            },{ // keypress to reboot kipling
                'name':'rebootKipling',
                'key':'ctrl+alt+shift+w',
                'platforms':['mac','win','linux'],
                'func': this.rebootKipling,
                'listeners': new Map()
            },{ // keypress to reboot kipling
                'name':'rebootKipling',
                'key':'ctrl+alt+shift+q',
                'platforms':['mac','win','linux'],
                'func': this.rebuildKipling,
                'listeners': new Map()
            },{ // keypress to reload io-manager kipling
                'name':'reloadCurrentModule',
                'key':'ctrl+r',
                'platforms':['mac','win','linux'],
                'func': this.reloadCurrentModule,
                'listeners': new Map()
            },{ // keypress to reload io-manager kipling
                'name':'forceReloadCurrentModule',
                'key':'ctrl+shift+f',
                'platforms':['mac','win','linux'],
                'func': this.forceReloadCurrentModule,
                'listeners': new Map()
            },{ // keypress to reload io-manager kipling
                'name':'devReLoadIOManager',
                'key':'ctrl+shift+r',
                'platforms':['mac','win','linux'],
                'func': this.devReLoadIOManager,
                'listeners': new Map()
            },{ // keypress to update and reload io-manager kipling
                'name':'devUpdateAndReLoadIOManager',
                'key':'ctrl+alt+shift+r',
                'platforms':['mac','win','linux'],
                'func': this.devUpdateAndReLoadIOManager,
                'listeners': new Map()
            },{ // windows keypress to save
                'name':'save',
                'key':'ctrl+s',
                'platforms':['win','linux'],
                'func': this.handleGenericKeypress,
                'listeners': new Map()
            },{ // mac keypress to save
                'name':'save',
                'key':'meta+s',
                'platforms':['mac'],
                'func': this.handleGenericKeypress,
                'listeners': new Map()
            },{ // zoom in
                'name':'zoomIn',
                'key':'ctrl+shift+=',
                'platforms':['mac','win','linux'],
                'func': this.handleZoomIn,
                'listeners': new Map()
            },{ // zoom out
                'name':'zoomOut',
                'key':'ctrl+-',
                'platforms':['mac','win','linux'],
                'func': this.handleZoomOut,
                'listeners': new Map()
            }
            // },{ // zoom inB
            //     'name':'zoomInB',
            //     'key':'+',
            //     'platforms':['mac','win','linux'],
            //     'func': this.handleZoomIn,
            //     'listeners': new Map()
            // },{ // zoom outB
            //     'name':'zoomOutB',
            //     'key':'-',
            //     'platforms':['mac','win','linux'],
            //     'func': this.handleZoomOut,
            //     'listeners': new Map()
            // }
        ];
        this.curPlatform = {
            'linux': 'linux',
            'linux2': 'linux',
            'sunos': 'linux',
            'solaris': 'linux',
            'freebsd': 'linux',
            'openbsd': 'linux',
            'darwin': 'mac',
            'mac': 'mac',
            'win32': 'win',
        }[process.platform];
        const currentPlatformKEH= this.curPlatform;
        const keysMap = {};
        this.keysList.forEach((info) => {
            let supportedPlatform = false;
            info.platforms.some((platform) => {
                if(platform === currentPlatformKEH) {
                    supportedPlatform = true;
                    return true;
                }
            });
            if(supportedPlatform) {
                keysMap[info.name] = info.key;
            }
        });
        this.keysMap = keysMap;

        this.keyFunctions = new Map();

        this.keyMap = {
            16:{'key':'shift', 'isPressed': false},
            17:{'key':'ctrl', 'isPressed': false},
            18:{'key':'alt', 'isPressed': false},
            27:{'key':'esc', 'isPressed': false},
            187:{'key': '=', 'isPressed': false},
            189:{'key': '-', 'isPressed': false},
            67:{'key':'c', 'isPressed': false},
            78:{'key':'f', 'isPressed': false},
            // 70:{'key':'d', 'isPressed': false},
            81:{'key':'q', 'isPressed': false},
            82:{'key':'r', 'isPressed': false},
            83:{'key':'s', 'isPressed': false},
            87:{'key':'w', 'isPressed': false},
            91:{'key':'cmd', 'isPressed': false},
        };
        this.keyList = [16, 17, 18, 27, 187, 189, 67, 78, 81, 82, 83, 87, 91];

        /**
         * Function to be used as the keydown listener
         **/
        this.lastKeydownEvent = null;
        this.ctrlKeyPressed = false;
        this.pressedKeys = {
            'ctrlKey': false,
            'altKey': false,
            'shiftKey': false,
            'metaKey': false,
        };

        this.managers = undefined;
    }

    handleGenericKeypress(info) {
        if(typeof(info.listeners) !== 'undefined') {
            info.listeners.forEach((listenerFunc, listenerName) => {
                try {
                    console.log('Executing','"'+listenerName+'"');
                    listenerFunc(info);
                } catch (err) {
                    console.log(
                        'Error executing keyboard_event_handler',
                        '"'+listenerName+'"',
                        'event name',
                        info.name,
                        'error',
                        err
                    );
                }
            });
        }
    }

    handleOpenConsole() {
        // console.log('in handleOpenConsole', info.name);
        const gui = global.gui;
        gui.Window.get().showDevTools();
    }

    rebootKipling(info) {
        console.log('in rebootKipling', info.name);
        const gui = global.gui;
        const child_process = require('child_process');
        let execStr = 'bash helper_scripts/reboot_scripts/mac_reboot.sh';
        const currentExecutable = process.execPath.split(' ')[0].split(/\.*\/Contents/g)[0];

        const args = [new Date().getTime().toString(), currentExecutable, 'run'];
        args.forEach((arg) => {
            execStr += ' ' + arg;
        });
        child_process.exec(execStr);
        console.log('Executed Script');
        gui.App.quit();
    }

    rebuildKipling(info) {
        console.log('in rebuildKipling', info.name);
        const gui = global.gui;
        const child_process = require('child_process');
        let execStr = 'bash helper_scripts/reboot_scripts/mac_reboot.sh';
        const currentExecutable = process.execPath.split(' ')[0].split(/\.*\/Contents/g)[0];

        const args = [new Date().getTime().toString(), currentExecutable, 'build'];
        args.forEach((arg) => {
            execStr += ' ' + arg;
        });
        child_process.exec(execStr);
        console.log('Executed Script');
        gui.App.quit();
    }

    reloadCurrentModule() {
        // Using jquery, search for selected tab & trigger the click event.
        const selectedTab = $('.module-chrome-tab.selected');
        if (selectedTab.length === 1) {
            selectedTab.click();
        } else {
            const curModuleName = global.MODULE_LOADER.current_module_data.name;
            return global.MODULE_LOADER.loadModuleByName(curModuleName);
        }
    }

    forceReloadCurrentModule() {
        global.MODULE_CHROME.enableModuleLoading();
        global.MODULE_CHROME.conditionallyClearCaches();
        this.reloadCurrentModule();
    }

    devUpdateAndReLoadIOManager(info) {
        if (gui.App.manifest.clearCachesOnModuleLoad || !!process.env.TEST_MODE || gui.App.manifest.test) {
            this.performUpgrade = true;
            this.devReLoadIOManager(info);
        }
    }

    startReload() {
        return new Promise((resolve) => {
            console.log('Reloading...');
            setTimeout(() => {

                console.log('Restarting!');
                if (this.performUpgrade) {
                    global.showCriticalAlert('DEV ONLY: Restarting/Updating Subprocess (IO_Manager).  Then re-loading Kipling.');
                    this.performUpgrade = false;

                    const cwd = path.join(process.cwd(), '..', 'ljswitchboard-io_manager');
                    console.log('CWD', cwd);
                    console.log('Updating io_manager node_modules');
                    const child_process = require('child_process');
                    const proc = child_process.exec(
                        'npm update', {
                            // cwd: 'C:\\ProgramData\\LabJack\\K3\\ljswitchboard-io_manager',
                            cwd: cwd,
                        }
                    );
                    proc.stdout.on('data', (data) => {
                        console.log('data from stdout', data.toString());
                    });

                    proc.stderr.on('data', (data) => {
                        console.log('data from stderr', data.toString());
                    });

                    proc.on('exit', (code) => {
                        console.log('Child exited with code ${code}', code);
                        console.log('DELAYING.....');
                        setTimeout(() => {
                                resolve();
                            },
                            10);
                    });

                } // IF
                else {
                    console.log('Skipping Upgrade');
                    setTimeout(() => {
                            resolve();
                        },
                        3000);
                }

            }, 10);
        });
    }

    performDevReload(info, io_interface) {
        global.showCriticalAlert('Restarting subprocess and re-loading Kipling.');
        this.reloading = true;
        console.log('Trying to restart subprocess');


        this.startReload()
            .then(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        console.log('LAST CALL!');
                        resolve();
                    }, 10);
                });
            })
            .then(io_interface.destroy)
            .then(() => {
                // Destroy io_manager cache
                // decache('ljswitchboard-io_manager');
                // window_manager.managedWindows.kipling.win.reload();
                // this.reloading = false;
            });
    }

    devReLoadIOManager(info) {
        if(gui.App.manifest.clearCachesOnModuleLoad || !!process.env.TEST_MODE || gui.App.manifest.test) {
            if(!this.reloading) {
                this.performDevReload(info);
            }
        }
    }

    handleEscapeKey(info) {
        // console.log('in handleEscapeKey');
        const curClassName = document.activeElement.className;
        const curID = document.activeElement.id;
        const curKey = curID + curClassName;
        // console.log('in handleEscapeKey',curKey,this.lastOnFocusElementKey,this.lastOnFocusElementValue);
        if (curKey === this.lastOnFocusElementKey) {
            const newText = this.lastOnFocusElementValue;
            document.activeElement.value = newText;
            document.activeElement.blur();
            this.specialElements.forEach((specialElement) => {
                if(specialElement.className === curClassName) {
                    specialElement.func(info,newText);
                }
            });
        }
    }

    handleZoomIn() {
        this.managers.zoom.zoomIn();
    }

    handleZoomOut() {
        this.managers.zoom.zoomOut();
    }

    onFocusListener(event) {
        this.lastOnFocusEvent = event;
        // console.log(event.target.value);
        this.lastOnFocusElementValue = event.target.value.toString();
        const className = event.target.className;
        const id = event.target.id;
        this.lastOnFocusElementID = id;
        this.lastOnFocusElementClassName = className;
        this.lastOnFocusElementKey = id + className;
    }

    initInputListeners() {
        this.lastOnFocusEvent = null;
        this.lastOnFocusElementValue = '';
        this.lastOnFocusElementKey = '';
        const inputElements = $('input');
        this.numInputListeners = inputElements.length;
        inputElements.unbind('focus');
        inputElements.bind('focus',this.onFocusListener);
    }

    convertKeyCode(code) {
        if(typeof(this.keyMap[code]) !== 'undefined') {
            return this.keyMap[code].key;
        } else {
            return '';
        }
    }

    dispatchFunc(key) {
        // Check to see if the key exists
        if(this.keyFunctions.has(key)) {
            // If the key exists, get the function & execute it.
            const keyFunction = this.keyFunctions.get(key);
            const func = keyFunction.func;
            try {
                func(keyFunction);
            } catch(err) {
                console.error('Error firing shortcut', key, err);
            }
        } else {
            console.log(key);
        }
    }

    printAllListeners() {
        console.log('Printing Listeners');
        this.keyFunctions.forEach((keyFunction) => {
            console.log('Event:','"'+keyFunction.name+'"','has',keyFunction.listeners.size,'listeners');
            let i = 1;
            keyFunction.listeners.forEach((listener,listenerName) => {
                console.log('\t'+(i.toString())+'.',listenerName);
                i += 1;
            });
        });
    }

    addListener(keyName, listenerName, listenerFunc) {
        keyName = this.keysMap[keyName];
        const isKeyName = (typeof(keyName) !== 'undefined');
        const isListenerName = (typeof(listenerName) !== 'undefined');
        const isListenerFunc = (typeof(listenerFunc) !== 'undefined');
        if(isKeyName && isListenerName && isListenerFunc) {
            if(this.keyFunctions.has(keyName)) {
                const tempKeyFunction = this.keyFunctions.get(keyName);
                tempKeyFunction.listeners.set(listenerName, listenerFunc);
                this.keyFunctions.set(keyName, tempKeyFunction);
            }
        }
    }

    deleteListener(keyName, listenerName) {
        keyName = this.keysMap[keyName];
        const isKeyName = (typeof(keyName) !== 'undefined');
        const isListenerName = (typeof(listenerName) !== 'undefined');
        if(isKeyName && isListenerName) {
            if(this.keyFunctions.has(keyName)) {
                const tempListeners = this.keyFunctions.get(keyName);
                tempListeners.listeners.delete(listenerName);
                this.keyFunctions.set(keyName, tempListeners);
            }
        }
    }

    keydownListener(event) {
        this.lastKeydownEvent = event;
        const keyNum = event.keyCode;
        // console.log('Key!!', keyNum, keyNum.toString());
        let str = '';
        if(event.ctrlKey) {
            // console.log('Ctrl Key Down');
            this.pressedKeys.ctrlKey = true;
            str += 'ctrl+';
        }
        if(event.altKey) {
            this.pressedKeys.altKey = true;
            str += 'alt+';
        }
        if(event.shiftKey) {
            this.pressedKeys.shiftKey = true;
            str += 'shift+';
        }
        if(event.metaKey) {
            this.pressedKeys.metaKey = true;
            str += 'meta+';
        }
        if(this.primaryKeysList.indexOf(keyNum) !== -1) {
            str += this.convertKeyCode(keyNum);
            this.dispatchFunc(str);
        } else {
            // console.log('keynum', keyNum);
        }
    }

    /**
     * Function to be used as the keyup listener
    **/
    keyupListener(event) {
        if(!event.ctrlKey) {
            // console.log('Ctrl Key Up');
            this.pressedKeys.ctrlKey = false;
        }
        if(!event.altKey) {
            this.pressedKeys.altKey = false;
        }
        if(!event.shiftKey) {
            this.pressedKeys.shiftKey = false;
        }
        if(!event.metaKey) {
            this.pressedKeys.metaKey = false;
        }
    }

    /**
     * Function to be called that sets up the document wide keypress listener.
    **/
    init(bundle) {
        this.managers = bundle;
        // Initialize the key listener list
        this.keysList.forEach((keysListItem) => {
            keysListItem.platforms.forEach((platform) => {
                // if the defined key has a matching platform, add it to the
                // list.
                if (platform === this.curPlatform) {
                    this.keyFunctions.set(keysListItem.key, keysListItem);
                }
            });
        });

        // bind listener to document's keypress event
        $(document).keydown(event => this.keydownListener(event));
        $(document).keyup(event => this.keyupListener(event));

        return Promise.resolve(bundle);
    }
}

// Initialize object and make object available in k3's namespace.
global.KEYBOARD_EVENT_HANDLER = new KeyboardEventHandler();
