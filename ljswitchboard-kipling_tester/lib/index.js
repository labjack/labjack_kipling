'use strict';

console.log("ljswitchboard-kipling_tester index.js");

window.addEventListener('clearReport', async (event) => {
    console.log('clearReport', event);
    document.getElementById('nodeunit_test_results').innerHTML = '';

});

window.addEventListener('addSuite', async (event) => {
    console.log('addSuite', event);

    if (document.getElementById('suite_' + event.payload.suiteId)) return;

    const resultsElem = document.getElementById('nodeunit_test_results');
    const liElem = document.createElement('li');
    liElem.classList.add('suite');
    resultsElem.appendChild(liElem);

    const hElem = document.createElement('h1');
    liElem.appendChild(hElem);
    hElem.innerText = event.payload.suiteName;

    const suiteListElem = document.createElement('ul');
    suiteListElem.id = 'suite_' + event.payload.suiteId;
    liElem.appendChild(suiteListElem);
});

window.addEventListener('addTest', async (event) => {
    console.log('addTest', event.payload);

    const testFile = event.payload.testFile;
    const testId = event.payload.testId;

    const suiteListElem = document.getElementById('suite_' + event.payload.suiteId);

    const liElem = document.createElement('li');
    suiteListElem.appendChild(liElem);
    liElem.classList.add('test');
    liElem.id = 'test_' + event.payload.testId;

    const divElement = document.createElement('div');
    liElem.appendChild(divElement);
    divElement.classList.add('no_select');

    const titleElem = document.createElement('span');
    divElement.appendChild(titleElem);
    titleElem.innerText = 'Test: ' + event.payload.title;

    const divElement2 = document.createElement('div');
    divElement.appendChild(divElement2);

    const statusElem = document.createElement('span');
    divElement2.appendChild(statusElem);
    statusElem.innerText = 'Status: ';

    const progElem = document.createElement('span');
    statusElem.appendChild(progElem);
    progElem.id = 'test_prog_' + event.payload.testId;
    progElem.innerText = 'In progress';

    const errorElem = document.createElement('pre');
    statusElem.appendChild(errorElem);
    errorElem.id = 'test_err_' + event.payload.testId;
    errorElem.style.display = 'none';

    /*
        const str = [
            '<li id="' + divID + '_result">',
            '<div class="no_select">',
            '<span>Test: ' + testFile + '</span>',
    /!*
            '<div class="results_button">',
            '<span>Status: <span id="' + divID + '_status">In Progress</span></span>',
            '<span id="' + divID + '_button" class="icon-list-2 toggle_button"></span>',
            '</div>',
    *!/
            '</div>',
            '</li>'
        ].join('');
    */
    // const testResults = $('#nodeunit_test_results');
    // testResults.append($(str));

/*
    const btn = $('#' + divID + '_button');
    btn.on('click', function() {
        testResults.slideToggle();
    });
*/
});

window.addEventListener('setProgress', async (event) => {
    console.log('setProgress', event);

    const testResults = $('#nodeunit_test_results');
    const passed = event.payload.passed;
    const testFile = event.payload.testFile;
    const testId = event.payload.testId;
    const divID = testId + '-test';

    // const testDiv = document.getElementById('nodeunit_test_results').innerHTML = '';
    const progElem = document.getElementById('test_prog_' + event.payload.testId);
    if (passed) {
        progElem.innerText = 'Success';
        progElem.style.color = 'green';
    } else {
        progElem.innerText = 'Error';
        progElem.style.color = 'red';
    }

    if (event.payload.err) {
        console.error(event.payload.err);
        const errorElem = document.getElementById('test_err_' + event.payload.testId);
        errorElem.innerText = event.payload.err.toString();
        errorElem.style.display = 'block';
    }

});
