

var q = require('q');
var async = require('async');

// Define the Mouse event Handler.
function createMouseEventHandler() {
    this.lastMouseEventData = undefined;
    this.keyboardEventHandler = undefined;
    this.windowZoomManager = undefined;

    function handleMouseScroll(event) {
        self.lastMouseEventData = event;
        // console.log('scroll detected!!');
        if(event.ctrlKey) {
            // console.log('Zooming!!');
            var wheelDelta = event.wheelDelta;
            var wheelDeltaY = event.wheelDeltaY;

            // Using the shift key while scrolling changes scroll to the X axis.
            // Therefore we need to ignore the situation when Y delta is zero.
            // or make the decision to allow both ctrl and ctrl + shift to allow
            // scrolling.... which is what is going to happen...
            
            // Enable only Y axis scroll deltas.
            // if(wheelDeltaY > 0) {
            //     self.windowZoomManager.zoomIn();
            // } else if(wheelDeltaY < 0) {
            //     self.windowZoomManager.zoomOut();
            // }

            // Enable X and Y axis scroll deltas.
            if(wheelDelta > 0) {
                self.windowZoomManager.zoomIn();
            } else if(wheelDelta < 0) {
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