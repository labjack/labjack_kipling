console.log('Building Kipling');

const path = require('path');
const child_process = require('child_process');

async function runScript(buildScript) {
	const cloned = JSON.parse(JSON.stringify(buildScript));

	cloned.scriptPath = path.normalize(path.join(
		__dirname, cloned.script + '.js'
	));
	cloned.cmd = 'node ' + cloned.scriptPath;
	cloned.isFinished = false;
	cloned.isSuccessful = false;

	console.log('==============================================');
	console.log('Starting Step:', cloned.text);
	console.log();


	return new Promise((resolve, reject) => {
		const child = child_process.exec(cloned.cmd);
		child.stdout.pipe(process.stdout);
		child.stderr.pipe(process.stderr);

		child.on('error', error => {
			console.error('Error Executing:', cloned.script, '-', cloned.text);
			console.error(error);
			reject();
		});

		child.on('exit', code => {
			if (code > 0) {
				reject();
			} else {
				resolve();
			}
		});
	});
}

// Figure out what OS we are building for
const buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform] || 'linux';

const mac_notarize = process.argv.some(() => {return process.argv.indexOf('mac_sign') > 0;});
// The LabJack macOS installer builder signs Kipling files, so we actually don't
// want to sign here.
if (mac_notarize) {
	console.log('**************************\n**** Signing ****\n**************************');
} else {
	console.log('**************************\n**** Not Signing ****\n**************************');
}

(async () => {
	try {
		await runScript({'script': 'clean_build', 'text': 'Cleaning Build Directory'});
		await runScript({'script': 'publish_locally', 'text': 'Publish Locally'});
		await runScript({'script': 'gather_project_files', 'text': 'Gathering Project Files'});
		await runScript({'script': 'edit_k3_startup_settings', 'text': 'Edit K3 Startup Settings'});
		await runScript({'script': 'install_production_dependencies', 'text': 'Installing production dependencies'});
		await runScript({'script': 'validate_internal_dependencies', 'text': 'Validating there are no duplicate internal dependencies'});

		if (buildOS === 'linux') {
			await runScript({'script': 'rebuild_native_modules', 'text': 'Rebuilding Native Modules (ffi & ref-napi)'});
		}

		await runScript({'script': 'clean_project', 'text': 'Cleaning Project'});

		if ((buildOS === 'darwin') && mac_notarize) {
			await runScript({'script': 'sign_mac_build_before_compression', 'text': 'Signing Mac OS Build.'});
		}

		await runScript({'script': 'organize_project_files', 'text': 'Organizing Project Files & compress into packages.'});
		await runScript({'script': 'electron_build', 'text': 'Run electron-builder'});
		// await runScript({'script': 'brand_project', 'text': 'Branding Project Files'});
		return;
		await runScript({'script': 'compress_output', 'text': 'Compressing Output and renaming'});

		if((buildOS === 'darwin') && mac_notarize) {
			await runScript({'script': 'sign_mac_build_after_compression', 'text': 'Signing Mac OS Build.'});
		}

		await runScript({'script': 'compress_output', 'text': 'Compressing Output and renaming'});
	} catch (err) {
		process.exit(1);
	}
})();
