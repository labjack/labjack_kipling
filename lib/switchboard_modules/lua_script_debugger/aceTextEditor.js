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
    this.destroy = function() {
        self.editor.destroy();
    };
    var editorTypes = ['luaEditor','console', 'basic'];

    this.setupEditor = function(id, theme, mode, type) {
        self.htmlID = id;
        self.editorTheme = theme;
        self.editorMode = mode;

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

            self.editor = ace.edit(id);
            self.editor.setTheme(theme);
            self.editor.getSession().setMode(mode);

            if(type === 'luaEditor') {
                // self.editor.setOptions({
                //     enableBasicAutocompletion: true,
                //     enableSnippets: true,
                //     enableLiveAutocompletion: true
                // });
                // self.editor.setOptions({'showInvisibles':true});
            }
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
    };
    this.getHeight = function() {
        if(self.curHeight == -1) {
            self.curHeight = $('#'+self.htmlID).height();
        }
        return self.curHeight;
    };

    var self = this;
}
