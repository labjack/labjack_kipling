'use strict';

const {EventEmitter} = require('events');

class WindowZoomManager extends EventEmitter {

    constructor() {
        super();

        this.zoomLevel = 1;
        this.zoomIncrement = 0.05;

        this.keyboardEventHandler = undefined;

        // Set the initial body zoom.
        window.document.body.style.zoom = this.initialZoom;
    }

    zoomIn() {
        this.zoomLevel = this.zoomLevel + this.zoomIncrement;
        window.document.body.style.zoom = this.zoomLevel;
        this.emit('zoomIn', this.zoomLevel);
        this.emit('zoom', this.zoomLevel);
    }

    zoomOut() {
        this.zoomLevel = this.zoomLevel - this.zoomIncrement;
        window.document.body.style.zoom = this.zoomLevel;
        this.emit('zoomOut', this.zoomLevel);
        this.emit('zoom', this.zoomLevel);
    }

    // The window zoom manager is initialized by the index.js file in the
    // Kipling application.
    init(bundle) {
        // console.log('Initializing window zoom manager', bundle);
        return Promise.resolve(bundle);
    }
}

var WINDOW_ZOOM_MANAGER = new WindowZoomManager();
