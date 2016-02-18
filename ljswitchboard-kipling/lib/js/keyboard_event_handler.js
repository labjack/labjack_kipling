/**
 * keyboard_event_handler.js for LabJack Switchboard.  Provides Kipling 
 * and all modules with a unified & error-safe way to respond to user keyboard 
 * events.
 *
 * @author Chris Johnson (LabJack, 2014)
**/

// Require npm libraries
var dict = require('dict');
var q = require('q');
var async = require('async');

// Require nodejs libraries
var os = require('os');
var path = require('path');


/**
 * keyboardEventHandler is an object that allows easy window-wide keypress 
 * handling.  Initialize object at the start of the program.
 * @return {[type]} [description]
**/
function keyboardEventHandler() {
    var escBinding = 'escape-input-listener-keyboard_event_handler';
    this.handleGenericKeypress = function(info) {
        if(typeof(info.listeners) !== 'undefined') {
            info.listeners.forEach(function(listenerFunc, listenerName){
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
    };
    this.handleOpenConsole = function(info) {
        // console.log('in handleOpenConsole', info.name);
        if(typeof(gui) === 'undefined') {
            gui = require('nw.gui');
        }
        gui.Window.get().showDevTools();
    };
    this.rebootKipling = function(info) {
        console.log('in rebootKipling', info.name);
        if(typeof(gui) === 'undefined') {
            gui = require('nw.gui');
        }
        var child_process = require('child_process');
        var execStr = 'bash helper_scripts/reboot_scripts/mac_reboot.sh';
        var currentExecutable = process.execPath.split(' ')[0].split(/\.*\/Contents/g)[0];

        var args = [new Date().getTime().toString(), currentExecutable, 'run'];
        args.forEach(function(arg) {
            execStr += ' ' + arg;
        });
        var bashObj = child_process.exec(execStr);
        console.log('Executed Script');
        gui.App.quit();
    };
    this.rebuildKipling = function(info) {
        console.log('in rebuildKipling', info.name);
        if(typeof(gui) === 'undefined') {
            gui = require('nw.gui');
        }
        var child_process = require('child_process');
        var execStr = 'bash helper_scripts/reboot_scripts/mac_reboot.sh';
        var currentExecutable = process.execPath.split(' ')[0].split(/\.*\/Contents/g)[0];

        var args = [new Date().getTime().toString(), currentExecutable, 'build'];
        args.forEach(function(arg) {
            execStr += ' ' + arg;
        });
        var bashObj = child_process.exec(execStr);
        console.log('Executed Script');
        gui.App.quit();
    };
    var specialElements = [
        {
            "className": "escapableInput typeahead tt-input",
            "func": function(info, newText) {
                $('.escapableInput.typeahead.tt-input').val(newText);
            }
        }
    ];
    this.handleEscapeKey = function(info) {
        // console.log('in handleEscapeKey');
        var curClassName = document.activeElement.className;
        var curID = document.activeElement.id;
        var curKey = curID + curClassName;
        // console.log('in handleEscapeKey',curKey,self.lastOnFocusElementKey,self.lastOnFocusElementValue);
        if(curKey === self.lastOnFocusElementKey) {
            var newText = self.lastOnFocusElementValue;
            document.activeElement.value = newText;
            document.activeElement.blur();
            specialElements.forEach(function(specialElement) {
                if(specialElement.className === curClassName) {
                    specialElement.func(info,newText);
                }
            });
        }
    };
    this.handleZoomIn = function(info) {
        console.log('in handleZoomIn');
        self.managers.zoom.zoomIn();
    };
    this.handleZoomOut = function(info) {
        console.log('in handleZoomOut');
        self.managers.zoom.zoomOut();
    };

    this.lastElementOriginalData = dict();
    this.lastOnFocusEvent = null;
    this.lastOnFocusElementValue = '';
    this.lastOnFocusElementID = '';
    this.lastOnFocusElementClassName = '';
    this.lastOnFocusElementKey = '';
    this.onFocusListener = function(event) {
        self.lastOnFocusEvent = event;
        // console.log(event.target.value);
        self.lastOnFocusElementValue = event.target.value.toString();
        var className = event.target.className;
        var id = event.target.id;
        self.lastOnFocusElementID = id;
        self.lastOnFocusElementClassName = className;
        self.lastOnFocusElementKey = id + className;
    };

    this.numInputListeners = 0;
    this.initInputListeners = function() {
        self.lastOnFocusEvent = null;
        self.lastOnFocusElementValue = '';
        self.lastOnFocusElementKey = '';
        var inputElements = $('input');
        self.numInputListeners = inputElements.length;
        inputElements.unbind('focus');
        inputElements.bind('focus',self.onFocusListener);
    };
    this.keysList = [
        {   // escape key
            'name':'esc',
            'key':'esc',
            'platforms':['mac','win','linux'],
            'func': this.handleEscapeKey,
            'listeners': dict()
        },{ // keypress to open debugging console
            'name':'openConsole',
            'key':'ctrl+alt+shift+c',
            'platforms':['mac','win','linux'],
            'func': this.handleOpenConsole,
            'listeners': dict()
        },{ // keypress to reboot kipling
            'name':'rebootKipling',
            'key':'ctrl+alt+shift+w',
            'platforms':['mac','win','linux'],
            'func': this.rebootKipling,
            'listeners': dict()
        },{ // keypress to reboot kipling
            'name':'rebootKipling',
            'key':'ctrl+alt+shift+q',
            'platforms':['mac','win','linux'],
            'func': this.rebuildKipling,
            'listeners': dict()
        },{ // windows keypress to save
            'name':'save',
            'key':'ctrl+s',
            'platforms':['win','linux'],
            'func': this.handleGenericKeypress,
            'listeners': dict()
        },{ // mac keypress to save
            'name':'save',
            'key':'meta+s',
            'platforms':['mac'],
            'func': this.handleGenericKeypress,
            'listeners': dict()
        },{ // zoom in
            'name':'zoomIn',
            'key':'ctrl+shift+=',
            'platforms':['mac','win','linux'],
            'func': this.handleZoomIn,
            'listeners': dict()
        },{ // zoom out
            'name':'zoomOut',
            'key':'ctrl+-',
            'platforms':['mac','win','linux'],
            'func': this.handleZoomOut,
            'listeners': dict()
        }
        // },{ // zoom inB
        //     'name':'zoomInB',
        //     'key':'+',
        //     'platforms':['mac','win','linux'],
        //     'func': this.handleZoomIn,
        //     'listeners': dict()
        // },{ // zoom outB
        //     'name':'zoomOutB',
        //     'key':'-',
        //     'platforms':['mac','win','linux'],
        //     'func': this.handleZoomOut,
        //     'listeners': dict()
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
    var currentPlatformKEH= this.curPlatform;
    var keysMap = {};
    this.keysList.forEach(function(info) {
        var supportedPlatform = false;
        info.platforms.some(function(platform) {
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

    this.keyFunctions = dict();

    this.keyMap = {
        16:{'key':'shift', 'isPressed': false},
        17:{'key':'ctrl', 'isPressed': false},
        18:{'key':'alt', 'isPressed': false},
        27:{'key':'esc', 'isPressed': false},
        187:{'key': '=', 'isPressed': false},
        189:{'key': '-', 'isPressed': false},
        67:{'key':'c', 'isPressed': false},
        81:{'key':'q', 'isPressed': false},
        83:{'key':'s', 'isPressed': false},
        87:{'key':'w', 'isPressed': false},
        91:{'key':'cmd', 'isPressed': false},
    };
    this.keyList = [16, 17, 18, 27, 187, 189, 67, 81, 83, 87, 91];

    var esc_KEY     = 27;
    var equ_KEY    = 187;
    var minus_KEY   = 189;
    var c_KEY       = 67;
    var q_KEY       = 81;
    var s_KEY       = 83;
    var w_KEY       = 87;
    this.primaryKeysList = [esc_KEY, minus_KEY, equ_KEY, c_KEY, 
        q_KEY, s_KEY, w_KEY];

    this.convertKeyCode = function(code) {
        if(typeof(self.keyMap[code]) !== 'unified') {
            return self.keyMap[code].key;
        } else {
            return '';
        }
    };

    this.dispatchFunc = function(key) {
        // Check to see if the key exists
        if(self.keyFunctions.has(key)) {
            // If the key exists, get the function & execute it.
            var keyFunction = self.keyFunctions.get(key);
            var func = keyFunction.func;
            func(keyFunction);
        }
    };

    this.printAllListeners = function() {
        console.log('Printing Listeners');
        self.keyFunctions.forEach(function(keyFunction,key) {
            console.log('Event:','"'+keyFunction.name+'"','has',keyFunction.listeners.size,'listeners');
            var i = 1;
            keyFunction.listeners.forEach(function(listener,listenerName) {
                console.log('\t'+(i.toString())+'.',listenerName);
                i += 1;
            });
        });
    };
    this.addListener = function(keyName, listenerName, listenerFunc) {
        keyName = self.keysMap[keyName];
        var isKeyName = (typeof(keyName) !== 'undefined');
        var isListenerName = (typeof(listenerName) !== 'undefined');
        var isListenerFunc = (typeof(listenerFunc) !== 'undefined');
        if(isKeyName && isListenerName && isListenerFunc) {
            if(self.keyFunctions.has(keyName)) {
                var tempKeyFunction = self.keyFunctions.get(keyName);
                tempKeyFunction.listeners.set(listenerName, listenerFunc);
                self.keyFunctions.set(keyName, tempKeyFunction);
            }
        }
    };
    this.deleteListener = function(keyName, listenerName, listenerFunc) {
        keyName = self.keysMap[keyName];
        var isKeyName = (typeof(keyName) !== 'undefined');
        var isListenerName = (typeof(listenerName) !== 'undefined');
        var isListenerFunc = (typeof(listenerFunc) !== 'undefined');
        if(isKeyName && isListenerName) {
            if(self.keyFunctions.has(keyName)) {
                var tempListeners = self.keyFunctions.get(keyName);
                tempListeners.listeners.delete(listenerName);
                self.keyFunctions.set(keyName, tempListeners);
            }
        }
    };

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
    this.keydownListener = function(event) {
        self.lastKeydownEvent = event;
        var keyNum = event.keyCode;
        var keyStr = keyNum.toString();
        // console.log('Key!!', keyNum, keyStr);
        var str = '';
        if(event.ctrlKey) {
            console.log('Ctrl Key Down');
            self.pressedKeys.ctrlKey = true;
            str += 'ctrl+';
        }
        if(event.altKey) {
            self.pressedKeys.altKey = true;
            str += 'alt+';
        }
        if(event.shiftKey) {
            self.pressedKeys.shiftKey = true;
            str += 'shift+';
        }
        if(event.metaKey) {
            self.pressedKeys.metaKey = true;
            str += 'meta+';
        }
        if(self.primaryKeysList.indexOf(keyNum) !== -1) {
            str += self.convertKeyCode(keyNum);
            self.dispatchFunc(str);
        }
    };

    /**
     * Function to be used as the keyup listener
    **/
    this.keyupListener = function(event) {
        if(!event.ctrlKey) {
            console.log('Ctrl Key Up');
            self.pressedKeys.ctrlKey = false;
        }
        if(!event.altKey) {
            self.pressedKeys.altKey = false;
        }
        if(!event.shiftKey) {
            self.pressedKeys.shiftKey = false;
        }
        if(!event.metaKey) {
            self.pressedKeys.metaKey = false;
        }
    };

    this.managers = undefined;

    /**
     * Function to be called that sets up the document wide keypress listener.
    **/
    this.init = function(bundle) {
        var defered = q.defer();

        self.managers = bundle;
        // Initialize the key listener list
        self.keysList.forEach(function(keysListItem) {
            keysListItem.platforms.forEach(function(platform) {
                // if the defined key has a matching platform, add it to the
                // list.
                if(platform === self.curPlatform) {
                    self.keyFunctions.set(keysListItem.key,keysListItem);
                }
            });
        });

        // bind listener to document's keypress event
        $(document).keydown(self.keydownListener);
        $(document).keyup(self.keyupListener);

        defered.resolve(bundle);
        return defered.promise;
    };

    var self = this;
}

// Initialize object and make object available in k3's namespace.
var KEYBOARD_EVENT_HANDLER = new keyboardEventHandler();

