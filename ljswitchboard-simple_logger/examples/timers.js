console.log('timers.js!!');
console.log('');
console.log('***************************');
console.log('This example requires there to be atleast 1 LJ device available (ANY,ANY,ANY).');
console.log('***************************');
console.log('');

var s = 0.0;
var rate = 0;
var timer;

function update()
{
	console.log(rate, s);
	rate = 0;
	s = 0.0;
}

function payload()
{
	for (var i = 0; i < 10000; i++);
		s += Math.sqrt(i);
	rate++;
}

function run()
{
	payload();
	timer.refresh();
}

setInterval(update, 1000);
timer = setTimeout(run, 1); // it does not matter what to write here: 1, 5, or 10 - the timeout is still 15+