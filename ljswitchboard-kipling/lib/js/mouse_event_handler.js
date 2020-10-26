'use strict';

// Define the Mouse event Handler.
class MouseEventHandler {

    constructor() {
        this.lastMouseEventData = undefined;
        this.keyboardEventHandler = undefined;
        this.windowZoomManager = undefined;
    }

    handleMouseScroll(event) {
        this.lastMouseEventData = event;
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
            //     this.windowZoomManager.zoomIn();
            // } else if(wheelDeltaY < 0) {
            //     this.windowZoomManager.zoomOut();
            // }

            // Enable X and Y axis scroll deltas.
            if(wheelDelta > 0) {
                this.windowZoomManager.zoomIn();
            } else if(wheelDelta < 0) {
                this.windowZoomManager.zoomOut();
            }
        }
    }

    // The mouse event handler is initialized by the index.js file in the
    // Kipling application.
    init(bundle) {
        this.keyboardEventHandler = bundle.keyboard;
        this.windowZoomManager = bundle.zoom;

        //adding the event listener for Mozilla
        if(window.addEventListener) {
            document.addEventListener('DOMMouseScroll', (event) => this.handleMouseScroll(event), false);
        }

        //for IE/OPERA etc
        document.onmousewheel = (event) => this.handleMouseScroll(event);


        return Promise.resolve(bundle);
    }
}

global.MOUSE_EVENT_HANDLER = new MouseEventHandler();
