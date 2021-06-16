'use strict';

/**
 * An accessory file for the Lua script debugger module that defines the
 * textEditor object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/

const editorTypes = ['luaEditor','console', 'basic'];
const ace = global.ace;

class textEditor {

    constructor() {
        this.curHeight = -1;
        this.htmlID = '';
        this.editor = null;
        this.editorTheme = '';
        this.session = null;
        this.editorMode = '';
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

    }

    destroy() {
        this.editor.destroy();
    }

    override(object, prop, replacer) {
        const old = object[prop]; object[prop] = replacer(old);
    }

    getZoom(element) {
       if (!element) return 1;
       return window.getComputedStyle(element).zoom * this.getZoom(element.parentElement);
    }

    setupEditor(id, theme, mode, type) {
        this.htmlID = id;
        this.editorTheme = theme;
        this.editorMode = mode;
        this.editorType = type;

        // Initialize the aceEditor instance
        const isValidType = type ? editorTypes.indexOf(type) >= 0 : false;
        if (!isValidType) {
            type = 'basic';
        }

        try {
            if (type === 'luaEditor') {
                // ace.require('ace/ext/language_tools'); // In hows of enabling autocompletion
            }

            this.editor = ace.edit(id, {
                mode: mode,
                
            });
            this.editor.setTheme(theme);
            this.session = this.editor.getSession();
            this.session.setMode(mode);

            if (type === 'luaEditor') {
                this.editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    // enableLiveAutocompletion: true
                });
                // this.editor.setOptions({'showInvisibles':true});
            } else if (type === 'console') {
                this.editor.renderer.setShowGutter(false);
            }

            // Monkeypatch ace editor "zoom" functionality:
            // https://github.com/ajaxorg/ace/issues/2475#issuecomment-364266978
            this.override(this.editor.renderer, "screenToTextCoordinates", (old) => {
                const self = this;
                return function (x, y) {
                    const zoom = self.getZoom(this.container);
                    return old.call(this, x / zoom, y / zoom);
                };
            });
        } catch(err) {
            console.error('Error initializing ace editor',err);
        }

        /*
        Cool Options:
        1. Enabling the display of all invisible characters:
        this.editor.setOptions({'showInvisibles':true});
        */
    }

    setHeight(newHeight) {
        const curLineNum = this.session.getLength();
        const isCursorVisible = this.editor.isRowVisible(curLineNum - 1);

        if (newHeight !== this.curHeight) {
            if (typeof(newHeight) === 'number') {
                $('#'+this.htmlID).height(newHeight.toString() + 'px');
            } else if (typeof(newHeight) === 'string') {
                $('#'+this.htmlID).height(newHeight + 'px');
            }
        }
        try{
            this.editor.resize(true);
        } catch(err) {
            console.error('Error Resizing ace editor',err);
            window.alert('Error resizing ace editor');
        }

        if (isCursorVisible && this.editorType === 'console') {
            this.editor.scrollToLine(curLineNum);
        }
    }

    getHeight() {
        if (this.curHeight === -1) {
            this.curHeight = $('#'+this.htmlID).height();
        }
        return this.curHeight;
    }

    getLength() {
        return this.editor.session.doc.getLength();
    }

    getValue() {
        return this.editor.session.doc.getValue();
    }

    setValue(data) {
        return this.editor.session.doc.setValue(data);
    }

    /*
     * Function for adding text to editor window.
     */
    appendText(textData) {
        const curLineNum = this.getLength();
        this.insert({
            row: curLineNum,
            column:0
        }, textData);
    }

    clear() {
        this.setValue('');
    }
    
    scrollToEnd() {
        const curLineNum = this.getLength();
        this.editor.scrollToLine(curLineNum);
    }

    insert(options, data) {
        try {
            // Get visibility information for where cursor currently is.
            const curLineNum = this.getLength();

            const isCursorVisible = this.editor.isRowVisible(curLineNum-3);

            this.editor.session.doc.insert(options, data);

            if (isCursorVisible) {
                // Adjust scroll to ensure line is visible still.
                this.editor.scrollToLine(curLineNum);
            } else {
                // Update the size of the scroll bar b/c it isn't automatically re-rendered.
                this.editor.renderer.$updateCachedSize();
            }

            /* Other options for updating zoom location for ace 1.4.x
            this.debuggingLog.editor.scrollToRow(this.debuggingLog.editor.selection.lead.row);

            // Option from ace editor source.
            editor.selection.moveToPosition(cursor);
            editor.renderer.scrollCursorIntoView();
            */
        } catch(err) {
            console.warn('Error inserting text', err);
        }
    }

    /*
     * Checking for linter errors (built in w/ ace text editor).
     */
    errorsExist() {
        return this.session.$annotations.length > 0;
    }

    getLinterErrors() {
        const errors = [];
        this.session.$annotations.forEach((annotation) => {
            if (annotation.type === 'error') {
                errors.push('Check line (' + (annotation.row+1).toString() + '). ' + annotation.text); 
            }
        });
        return errors;
    }

    checkScriptFWCompatibility(device) {
        const dtn = device.savedAttributes.deviceTypeName;
        const fwVer = device.savedAttributes.FIRMWARE_VERSION;
        const source = JSON.parse(JSON.stringify(this.getValue()));
        let isError = false;
        let line = -1;
        let errorMessage = '';
        this.functionReqs.some((functionReq) => {
            let strsToCheck = [];
            let reqObj = null;

            functionReq.minVersions.some((req) => {
                if (req.dtn == dtn && fwVer < req.fw) {
                    strsToCheck = functionReq.strs;
                    reqObj = req;
                }
            });

            if (strsToCheck.length > 0) {
                isError = strsToCheck.some((strToCheck) => {
                    return source.split('\n').some((splitLine, i) => {
                        const err = splitLine.indexOf(strToCheck) >= 0;
                        if (err) {
                            line = i + 1;
                            errorMessage = 'Error: The function "'+strToCheck+'" on line '+line.toString()+' requires firmware version: ' + reqObj.fw.toFixed(4) + ' or greater.\n';
                            
                            if (typeof(functionReq.urlPageTitle) == 'string' && typeof(functionReq.urlPageTitle) === 'string') {
                                errorMessage += 'For more information about this error go to the website page: \n';
                                errorMessage += functionReq.urlPageTitle + ':\n';
                                errorMessage += functionReq.urlRef;
                            }
                            return true;
                        }
                    });
                });
            }
        });
        return {
            isError: isError,
            message: errorMessage
        };
    }

}

global.textEditor = textEditor;
