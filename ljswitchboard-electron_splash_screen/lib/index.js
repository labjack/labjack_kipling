window.addEventListener('splash_update', (event) => {
	const {message, level} = event.payload;
	const progressTextElement = document.querySelector('.progress-text');
	const stepResult = document.createElement('div');
	stepResult.innerText = message;
	if (level) {
		stepResult.classList.add(level);
	}
	if ('fail' === level) {
		progressTextElement.failed = true;
	}
	progressTextElement.appendChild(stepResult);

	const scrollHeight = Math.max(progressTextElement.scrollHeight, progressTextElement.clientHeight);
	progressTextElement.scrollTop = scrollHeight - progressTextElement.clientHeight;
});

window.addEventListener('splash_finish', (event) => {
	const progressTextElement = document.querySelector('.progress-text');
	const logPath = event.payload;
	if (progressTextElement.failed) {
		if (logPath) {
			const stepResult = document.createElement('div');
			stepResult.innerText = 'Detailed log can be found here: ';
			const link = document.createElement('a');
			link.setAttribute('href', 'file://' + logPath);
			link.setAttribute('target', '_blank');
			link.innerText = logPath;
			link.addEventListener('click', (event) => {
				event.stopPropagation();
				event.preventDefault();
				const shell = require('electron').shell;
				shell.openExternal('file://' + logPath);
			});

			stepResult.appendChild(link);
			progressTextElement.appendChild(stepResult);
		}

		progressTextElement.classList.add('finished');
		progressTextElement.classList.add('failed');
	}
});
