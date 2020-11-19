const path = require('path');
const fs = require('fs');

function resolveLink(link) {
	const cwd = path.join(path.dirname(module.filename), '..', 'static');
	return path.normalize(path.join(cwd, link));
}

function getDir() {
	const cwd = path.join(path.dirname(module.filename), '..', 'static');
	if (process.platform !== 'win32') {
		return cwd + path.sep;
	} else {
		// force path to be a url/unix style path.
		return cwd.split('\\').join('/') + '/';
	}
}

async function loadResources(win, resourceLinks, isLocal, location) {
	const injectScript = fs.readFileSync(path.join(path.dirname(module.filename), 'preload.js'));
	await win.webContents.executeJavaScript(injectScript.toString('utf-8'));

	const resources = resourceLinks.map(resourceLink => {
		const link = isLocal ? resourceLink : resolveLink(resourceLink);
		const filetype = path.extname(resourceLink);

		return {
			link, filetype
		};
	});

	win.webContents.send('postMessage', {
		'channel': 'load_resources',
		'payload': {
			resources, isLocal, location
		}
	});
}

exports.getDir = getDir;
exports.loadResources = loadResources;
exports.info = {
	'type': 'staticFiles'
};
