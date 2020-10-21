/**
 Created this function w/ the help of:
 1. http://www.javascriptkit.com/javatutors/loadjavascriptcss2.shtml
 Aided in generically "how to load a script/css" dynamically...  There were
 issues with loading jquery as it wasn't getting defined right away.
 2. http://www.sitepoint.com/dynamically-load-jquery-library-javascript/
 Aided in detecting when a script is loaded.
 **/
async function loadJsCssFile(filename, filetype, documentLocation) {
    const location = documentLocation ? documentLocation : 'head';

    console.log('Loading resource:', filename);
    return new Promise(function (resolve) {
        if (filetype === '.js') {
            const fileRef = document.createElement('script');
            fileRef.setAttribute('type','text/javascript');
            fileRef.setAttribute('src', filename);

            fileRef.onload = function () {
                resolve();
            };

            // configure the file's source url
            document.getElementsByTagName(location)[0].appendChild(fileRef);
        }
        else if (filetype === '.css') {
            const fileRef = document.createElement('link');
            fileRef.setAttribute('rel', 'stylesheet');
            fileRef.setAttribute('type', 'text/css');
            fileRef.setAttribute('href', filename);
            document.getElementsByTagName(location)[0].appendChild(fileRef);
            resolve();
        }
        else {
            throw 'Unknown filetype: ' + filetype;
        }
    });
}

async function loadResources(win, resources, isLocal, location) {
    const injectScript = fs.readFileSync(path.join(path.dirname(module.filename), 'preload.js'));
    await win.webContents.executeJavaScript(injectScript.toString('utf-8'));

    for (const resourceLink of resources) {
        const link = isLocal ? resourceLink : resolveLink(resourceLink);
        const filetype = path.extname(resourceLink);

        win.webContents.send('postMessage', {
            'channel': 'loadJsCssFile',
            'payload': {
                link, filetype, location
            }
        });
    }
}

global.loadJsCssFile = loadJsCssFile;

window.addEventListener('load_resources', async (event) => {
    const {resources, isLocal, location} = event.payload;
    if (typeof module === 'object') {window.module = module; module = undefined;}
    for (const resource of resources) {
        await loadJsCssFile(resource.link, resource.filetype, location);
    }
    if (window.module) module = window.module;
});
