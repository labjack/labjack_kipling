'use strict';

console.log("ljswitchboard-core index.js");

window.addEventListener('message_formatter_append', (event) => {
    const compiledData = event.payload;
    console.log('message_formatter_append', compiledData);
    const pageReference = document.querySelector('#loadSteps');
    pageReference.innerHTML += compiledData;
});
