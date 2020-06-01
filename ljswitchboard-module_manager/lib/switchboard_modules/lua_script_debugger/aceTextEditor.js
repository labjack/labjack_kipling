/**
 * An accessory file for the Lua script debugger module that defines the
 * textEditor object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/


function textEditor() {
    var editor;
    var htmlID = '';
    var editorTheme = '';
    var editorMode = '';
    var curHeight = -1;
    var session;
    var editorType = 'basic';

    var editorContents = '';


    this.destroy = function() {
        self.editor.destroy();
    };
    var editorTypes = ['luaEditor','console', 'basic'];

    function override(object, prop, replacer) {
        var old = object[prop]; object[prop] = replacer(old);
    }
    function getZoom(element) {
       if (!element) return 1;
       return window.getComputedStyle(element).zoom * getZoom(element.parentElement);
    }

    this.setupEditor = function(id, theme, mode, type) {
        self.htmlID = id;
        self.editorTheme = theme;
        self.editorMode = mode;
        self.editorType = type;

        // Initialize the aceEditor instance
        var isValidType = false;
        if(type) {
            isValidType = editorTypes.indexOf(type) >= 0;
        }
        if(!isValidType) {
            type = 'basic';
        }

        try{
            if(type === 'luaEditor') {
                // ace.require('ace/ext/language_tools'); // In hows of enabling autocompletion
            }

            self.editor = ace.edit(id, {
                mode: mode,
                
            });
            self.editor.setTheme(theme);
            self.session = self.editor.getSession();
            self.session.setMode(mode);

            if(type === 'luaEditor') {
                self.editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    // enableLiveAutocompletion: true
                });
                // self.editor.setOptions({'showInvisibles':true});
            } else if(type === 'console') {
                self.editor.renderer.setShowGutter(false);
            }

            // Monkeypatch ace editor "zoom" functionality:
            // https://github.com/ajaxorg/ace/issues/2475#issuecomment-364266978
            override(self.editor.renderer, "screenToTextCoordinates", function(old) {
                return function(x, y) {
                    var zoom = getZoom(this.container);
                    return old.call(this, x/zoom, y/zoom);
                };
            });
        } catch(err) {
            console.error('Error initializing ace editor',err);
        }

        /*
        Cool Options:
        1. Enabling the display of all invisible characters:
        self.editor.setOptions({'showInvisibles':true});


         */
    };
    this.setHeight = function(newHeight) {
        var curLineNum = self.session.getLength();
        var isCursorVisible = self.editor.isRowVisible(curLineNum - 1);

        if(newHeight != self.curHeight) {
            if (typeof(newHeight) === 'number') {
                $('#'+self.htmlID).height(newHeight.toString() + 'px');
            } else if (typeof(newHeight) === 'string') {
                $('#'+self.htmlID).height(newHeight + 'px');
            }
        }
        try{
            self.editor.resize(true);
        } catch(err) {
            console.error('Error Resizing ace editor',err);
            alert('Error resizing ace editor');
        }

        if(isCursorVisible && self.editorType === 'console') {
            self.editor.scrollToLine(curLineNum);
        }
    };
    this.getHeight = function() {
        if(self.curHeight == -1) {
            self.curHeight = $('#'+self.htmlID).height();
        }
        return self.curHeight;
    };

    this.getLength = function() {
        return self.editor.session.doc.getLength();
    };
    this.getValue = function() {
        return self.editor.session.doc.getValue();
    };
    this.setValue = function(data) {
        return self.editor.session.doc.setValue(data);
    };

    /*
     * Function for adding text to editor window.
     */
    this.appendText = function(textData) {
        var curLineNum = self.getLength();
        self.insert({
            row: curLineNum,
            column:0
        }, textData);
    };

    this.clear = function() {
        self.setValue('');
    };
    
    this.scrollToEnd = function() {
        var curLineNum = self.getLength();
        self.editor.scrollToLine(curLineNum);
    };

    this.insert = function(options, data) {
        try {
            // Get visibility information for where cursor currently is.
            var curLineNum = self.getLength();

            var isCursorVisible = self.editor.isRowVisible(curLineNum-3);

            self.editor.session.doc.insert(options, data);

            if(isCursorVisible) {
                // Adjust scroll to ensure line is visible still.
                self.editor.scrollToLine(curLineNum);
            } else {
                // Update the size of the scroll bar b/c it isn't automatically re-rendered.
                self.editor.renderer.$updateCachedSize();
            }

            /* Other options for updating zoom location for ace 1.4.x
            self.debuggingLog.editor.scrollToRow(self.debuggingLog.editor.selection.lead.row);

            // Option from ace editor source.
            editor.selection.moveToPosition(cursor);
            editor.renderer.scrollCursorIntoView();
            */
        } catch(err) {
            console.warn('Error inserting text', err);
        }
    };

    /*
     * Checking for linter errors (built in w/ ace text editor).
     */
    this.errorsExist = function() {
        return self.session.$annotations.length > 0;
    };
    this.getLinterErrors = function() {
        var errors = [];
        self.session.$annotations.forEach(function(annotation) {
            if(annotation.type === 'error') {
                errors.push('Check line (' + (annotation.row+1).toString() + '). ' + annotation.text); 
            }
        });
        return errors;
    };

    /*
     * Checking for LJ library errors.
     */
    this.functionReqs = [{
        'strs': ['MB.writeName','MB.readName'],
        'minVersions': [{
            'dtn': 'T4',
            'fw': 1.0023
        }, {
            'dtn': 'T7',
            'fw': 1.0282
        }],
        'urlPageTitle': 'LabJack Lua Library and find the section "Modbus Name Functions"',
        'urlRef': 'https://labjack.com/support/datasheets/t-series/scripting/labjack-library#name-functions',
    }, {
        'strs': ['I2C.config','I2C.writeRead', 'I2C.read', 'I2C.write', 'I2C.search'],
        'minVersions': [{
            'dtn': 'T4',
            'fw': 1.0000
        }, {
            'dtn': 'T7',
            'fw': 1.0225
        }],
        'urlRef': 'https://labjack.com/support/datasheets/t-series/scripting/I2C-Library',
    }];
    this.checkScriptFWCompatibility = function(device) {
        var dtn = device.savedAttributes.deviceTypeName;
        var fwVer = device.savedAttributes.FIRMWARE_VERSION;
        var source = self.getValue();
        source = JSON.parse(JSON.stringify(source));
        var isError = false;
        var line = -1;
        var errorMessage = '';
        var i = 0;
        self.functionReqs.some(function(functionReq) {
            var strsToCheck = [];
            var reqObj = null;

            functionReq.minVersions.some(function(req) {
                if(req.dtn == dtn && fwVer < req.fw) {
                    strsToCheck = functionReq.strs;
                    reqObj = req;
                    return;
                }
            });
            
            if(strsToCheck.length > 0) {
                isError = strsToCheck.some(function(strToCheck) {
                    return source.split('\n').some(function(splitLine, i) {
                        var err = splitLine.indexOf(strToCheck) >= 0;
                        if(err) {
                            line = i+1;
                            errorMessage = 'Error: The function "'+strToCheck+'" on line '+line.toString()+' requires firmware version: ' + reqObj.fw.toFixed(4) + ' or greater.\n';
                            
                            if(typeof(functionReq.urlPageTitle) == 'string' && typeof(functionReq.urlPageTitle) == 'string') {
                                errorMessage += 'For more information about this error go to the website page: \n';
                                errorMessage += functionReq.urlPageTitle + ':\n';
                                errorMessage += functionReq.urlRef;
                            }
                            return true;
                        }
                    })
                });
            }
        });
        return {
            isError: isError,
            message: errorMessage
        };
    }


    var self = this;
}
