

var q = require('q');
var async = require('async');

// Define the Mouse event Handler.
function createMouseEventHandler() {
    
    this.keyboardEventHandler = undefined;
    this.windowZoomManager = undefined;

    function handleMouseScroll(event) {
        console.log('scroll detected!!');
        if(self.keyboardEventHandler.pressedKeys.ctrlKey) {
            // console.log('Zooming!!');
            var wheelDelta = event.wheelDelta;
            var wheelDeltaY = event.wheelDeltaY;

            if(wheelDeltaY > 0) {
                self.windowZoomManager.zoomIn();
            } else {
                self.windowZoomManager.zoomOut();
            }
        }
    }
    
    // The mouse event handler is initialized by the index.js file in the 
    // Kipling application.
    this.init = function(bundle) {
        // console.log('Initializing mouse event handler', bundle);
        var defered = q.defer();

        self.keyboardEventHandler = bundle.keyboard;
        self.windowZoomManager = bundle.zoom;

        //adding the event listerner for Mozilla
        if(window.addEventListener) {
            document.addEventListener('DOMMouseScroll', handleMouseScroll, false);
        }

        //for IE/OPERA etc
        document.onmousewheel = handleMouseScroll;
        

        defered.resolve(bundle);
        return defered.promise;
    };

    var self = this;
}
var MOUSE_EVENT_HANDLER = new createMouseEventHandler();