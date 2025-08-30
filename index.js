const currentTask = {
	active: false,
	duration: -1,
	finish: -1,
	running: false,

	paused: false,
	pauseInterval: 0,
	pauseStart: 0,
	
	/** @type HTMLElement | null */
	element: null
};

const TIME_UNIT = 60000; // 1mn
const ADD_TIME = 5; // in TIME_UNIT
const PAUSE_TIMER_PRECISION = 500;

const BODY = {
	timer: document.getElementById('timer'),
	buttonDiv: document.getElementById('buttonDiv'),
	start: document.getElementById('start'),
	pause: document.getElementById('pause'),
	resume: document.getElementById('resume'),
	resumeTime: document.getElementById('resumeTime'),
	finish: document.getElementById('finish'),
	addTime: document.getElementById('addTime'),
	exit: document.getElementById('exit'),
	taskList: document.getElementById('taskList'),
	addTask: document.getElementById('addTask'),
};


function startTimer() {
	if (currentTask.active)
		return;

	const firstTask = getFirstTask();
	if (!firstTask)
		return;


	// Update UI
	BODY.start.classList.add('hidden');
	BODY.timer.classList.remove('hidden');
	BODY.pause.classList.remove('hidden');
	BODY.finish.classList.remove('hidden');
	BODY.addTime.classList.remove('hidden');
	BODY.exit.classList.remove('hidden');

	// Init current task
	const minutes = parseInt(firstTask.children[2].value);
	const duration = minutes * TIME_UNIT;

	currentTask.duration = duration;
	currentTask.finish = Date.now() + duration;
	currentTask.element = firstTask;
	currentTask.element.children[0].innerText = '⏳';

	currentTask.active = true;
	currentTask.paused = false;

	currentTask.running = true;
	requestAnimationFrame(updateTimer);
}

function updateTimer() {
	if (!currentTask.active || currentTask.paused)
		return;

	let remaining = currentTask.finish - Date.now();
	if (remaining <= 0) {
		finishTask();

	} else {
		const ratio = remaining / currentTask.duration;
	
		remaining /= 1000;
		const hours = Math.floor(remaining / 3600);
		const minutes = Math.floor(remaining / 60) % 60;
		const seconds = Math.floor(remaining % 60);
	
		displayTimeLeft(hours, minutes, seconds, ratio);
	}

	requestAnimationFrame(updateTimer);
}

function finishTask() {
	if (!currentTask.active || currentTask.paused)
		return;

	// Switch to next task
	currentTask.element.children[0].innerText = '✔️';
	currentTask.element.classList.add('finished');


	const next = getNextTask(currentTask.element);

	if (!next) {
		stopTimer();
		return;
	}

	
	
	currentTask.element = next;
	next.children[0].innerText = '⏳';
	
	const minutes = parseInt(next.children[2].value);
	const duration = minutes * TIME_UNIT;

	currentTask.duration = duration;
	currentTask.finish = Date.now() + duration;
}

function stopTimer() {
	if (!currentTask.active || currentTask.paused)
		return;


	// Update data
	currentTask.running = false;
	clearInterval(currentTask.pauseInterval);
	currentTask.active = false;

	// Update UI
	BODY.start.classList.remove('hidden');
	BODY.timer.classList.add('hidden');
	BODY.pause.classList.add('hidden');
	BODY.finish.classList.add('hidden');
	BODY.addTime.classList.add('hidden');
	BODY.exit.classList.add('hidden');
}


function updatePauseTimer() {
	if (!currentTask.active || !currentTask.paused)
		return;

	const duration = (Date.now() - currentTask.pauseStart) / 1000;
	const minutes = Math.floor(duration / 60);
	const seconds = Math.floor((duration % 60));
	BODY.resumeTime.innerText = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function isTaskValid(task) {
	return !task.classList.contains('finished') &&
		task.children[1].value != '' &&
		parseInt(task.children[2].value) > 0;
}

function getFirstTask() {
	const task = BODY.taskList.children[0];
	if (!task)
		return null;

	if (isTaskValid(task))
		return task;

	
	const next = getNextTask(task);
	task.remove();
	return next;
}

function getNextTask(element) {
	let next = element.nextElementSibling;
	
	while (next) {
		if (next.classList.contains('finished')) {
			next = next.nextElementSibling;
			continue;
		}

		if (next.children[1].value == '' || !(parseInt(next.children[2].value) > 0)) {
			const nextBff = next.nextElementSibling;
			next.remove();
			next = nextBff;
			continue;
		}

		break;
	}

	console.log(next);
	return next;
}



function addTask() {
	const div = document.createElement('div');
	div.innerHTML = `
		<button onclick="removeTask(event)">❌</button>
		<input type="text" placeholder="Task">
		<input type="number" placeholder="duration">
	`;

	BODY.taskList.appendChild(div);
	return div;
}

function removeTask(event) {
	const div = event.target.parentElement;

	if (div != currentTask.element)
		div.remove();
}


function displayTimeLeft(hours, minutes, seconds, ratio) {
	const SIZE = BODY.timer.width;
	const ctx = BODY.timer.getContext('2d');

    const radius = SIZE / 2 - 10; // marge pour éviter de couper
    const centerX = SIZE / 2;
    const centerY = SIZE / 2;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // --- Cercle de fond ---
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 12;
    ctx.stroke();

    // --- Arc de temps restant ---
    const startAngle = -Math.PI / 2; // départ en haut
    const endAngle = startAngle + 2 * Math.PI * ratio;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    // --- Texte du temps restant ---
    ctx.fillStyle = "#000";
    ctx.font = `${SIZE / 8}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const timeText = 
        (hours > 0 ? String(hours).padStart(2, "0") + ":" : "") +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    ctx.fillText(timeText, centerX, centerY);
}




BODY.start.onclick = () => {
	// Check already active
	if (currentTask.active)
		return;

	// Remove unused task
	for (let i = 0; i < BODY.taskList.children.length; i++) {
		const task = BODY.taskList.children[i];
		if (task.children[1].value == '' || task.children[2].value == '') {
			task.remove();
			i--;
		}
	}


	// Start the timer
	startTimer();
};

BODY.pause.onclick = () => {
	if (!currentTask.active || currentTask.paused)
		return;

	currentTask.running = false;
	currentTask.paused = true;
	currentTask.pauseStart = Date.now();
	currentTask.pauseInterval = setInterval(updatePauseTimer, PAUSE_TIMER_PRECISION);

	BODY.resumeTime.innerText = "00:00";
	BODY.resume.classList.remove('hidden');
	BODY.pause.classList.add('hidden');
	BODY.finish.classList.add('hidden');
	BODY.addTime.classList.add('hidden');
	BODY.exit.classList.add('hidden');
};

BODY.resume.onclick = () => {
	if (!currentTask.active || !currentTask.paused)
		return;

	clearInterval(currentTask.pauseInterval);
	currentTask.paused = false;
	currentTask.finish += Date.now() - currentTask.pauseStart;
	currentTask.running = true;
	requestAnimationFrame(updateTimer);

	BODY.resume.classList.add('hidden');
	BODY.pause.classList.remove('hidden');
	BODY.finish.classList.remove('hidden');
	BODY.addTime.classList.remove('hidden');
	BODY.exit.classList.remove('hidden');};

BODY.finish.onclick = finishTask;

BODY.addTime.onclick = () => {
	if (!currentTask.active || currentTask.paused)
		return;

	currentTask.finish += ADD_TIME * TIME_UNIT;
};

BODY.exit.onclick = () => {
	if (!currentTask.active)
		return;

	currentTask.element.children[0].innerText = '❌';
	currentTask.element.children[0].onclick = removeTask;
	stopTimer();
};

BODY.addTask.onclick = () => {addTask();};




function debugAddTasks() {
	for (let i = 0; i < 5; i++) {
		const div = addTask();
		div.children[1].value = `Task #${i + 1}`;
		div.children[2].value = "70";
	}
}