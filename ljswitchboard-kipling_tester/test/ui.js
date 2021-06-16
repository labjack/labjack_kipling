'use strict';

exports.testClick = async function (kiplingWin, selector) {
    kiplingWin.webContents.postMessage('postMessage', {
        'channel': 'test_click',
        'payload': {
            selector
        }
    });
};
