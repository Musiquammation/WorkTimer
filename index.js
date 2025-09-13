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

let saveTaskForbidden = true;

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

// ===============================
// FONCTIONS LOCALSTORAGE
// ===============================

function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    }
}

const saveTasksDebounced = debounce(saveTasks, 500);

/**
 * Sauvegarde la liste des tâches dans localStorage
 */
function saveTasks() {
	if (saveTaskForbidden)
		return;

	try {
		const tasks = [];
		
		// Lire directement depuis l'HTML
		for (let i = 0; i < BODY.taskList.children.length; i++) {
			const taskElement = BODY.taskList.children[i];
			const label = taskElement.children[2].value.trim();
			const durationStr = taskElement.children[3].value.trim();
			
			// Ignorer les tâches sans label ou durée
			if (label === '' || durationStr === '' || isNaN(parseFloat(durationStr))) {
				continue;
			}
			
			const duration = parseFloat(durationStr);
			const state = taskElement.classList.contains('finished') ? 1 : 0;
			
			tasks.push({
				label: label,
				duration: duration,
				state: state
			});
		}
		
		localStorage.setItem('worktimer-tasks', JSON.stringify(tasks));
		console.log('Tâches sauvegardées:', tasks);
	} catch (error) {
		console.error('Erreur lors de la sauvegarde:', error);
	}
}

/**
 * Charge la liste des tâches depuis localStorage
 */
function loadTasks() {
	try {
		const savedTasks = localStorage.getItem('worktimer-tasks');
		if (!savedTasks) {
			saveTaskForbidden = false;
			return;
		}
		
		const tasks = JSON.parse(savedTasks);
		
		// Vider la liste actuelle
		BODY.taskList.innerHTML = '';
		
		// Recréer les tâches
		tasks.forEach(taskData => {
			const taskElement = addTask();
			taskElement.children[2].value = taskData.label;
			taskElement.children[3].value = taskData.duration.toString();
			
			if (taskData.state === 1) {
				taskElement.classList.add('finished');
				taskElement.children[1].innerText = '✔️';
			}
		});
		
		console.log('Tâches chargées:', tasks);
	} catch (error) {
		console.error('Erreur lors du chargement:', error);
	}

	saveTaskForbidden = false;
}

/**
 * Efface toutes les tâches du localStorage
 */
function clearSavedTasks() {
	try {
		localStorage.removeItem('worktimer-tasks');
		console.log('Tâches effacées du localStorage');
	} catch (error) {
		console.error('Erreur lors de l\'effacement:', error);
	}
}

// ===============================
// FONCTIONS TIMER (MODIFIÉES)
// ===============================

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
	const minutes = parseFloat(firstTask.children[3].value);
	const duration = minutes * TIME_UNIT;

	currentTask.duration = duration;
	currentTask.finish = Date.now() + duration;
	currentTask.element = firstTask;
	currentTask.element.children[1].innerText = '⏳';

	currentTask.active = true;
	currentTask.paused = false;

	currentTask.running = true;
	requestAnimationFrame(updateTimer);
	
	// Sauvegarder après changement d'état
	saveTasks();
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
	currentTask.element.children[1].innerText = '✔️';
	currentTask.element.classList.add('finished');

	// Sauvegarder après qu'une tâche soit accomplie
	saveTasks();

	const next = getNextTask(currentTask.element);

	if (!next) {
		stopTimer();
		return;
	}

	currentTask.element = next;
	next.children[1].innerText = '⏳';
	
	const minutes = parseFloat(next.children[3].value);
	const duration = minutes * TIME_UNIT;

	currentTask.duration = duration;
	currentTask.finish = Date.now() + duration;
	
	// Sauvegarder après changement de tâche active
	saveTasks();
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
	
	// Sauvegarder après arrêt
	saveTasks();
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
		task.children[2].value != '' &&
		parseFloat(task.children[3].value) > 0;
}

function getFirstTask() {
	const task = BODY.taskList.children[0];
	if (!task)
		return null;

	if (isTaskValid(task))
		return task;

	const next = getNextTask(task);
	task.remove();
	// Sauvegarder après suppression automatique
	saveTasks();
	return next;
}

function getNextTask(element) {
	let next = element.nextElementSibling;
	
	while (next) {
		if (next.classList.contains('finished')) {
			next = next.nextElementSibling;
			continue;
		}

		if (next.children[2].value == '' || !(parseFloat(next.children[3].value) > 0)) {
			const nextBff = next.nextElementSibling;
			next.remove();
			// Sauvegarder après suppression automatique
			saveTasks();
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
		<span class="drag-handle">≡</span>
		<button onclick="removeTask(event)">❌</button>
		<input type="text" placeholder="Task">
		<input type="number" placeholder="duration">
	`;

	BODY.taskList.appendChild(div);
	
	makeTaskDraggable(div);
	
	// Ajouter des event listeners pour sauvegarder quand les inputs changent
	const taskInput = div.children[2];
	const durationInput = div.children[3];
	
	taskInput.addEventListener('input', saveTasksDebounced);
	taskInput.addEventListener('blur', saveTasks); // on sauvegarde aussi au blur
	durationInput.addEventListener('input', saveTasksDebounced);
	durationInput.addEventListener('blur', saveTasks);

	// Sauvegarder après création
	saveTasks();

	return div;
}

function addTaskWithoutSave() {
	const div = document.createElement('div');
	div.innerHTML = `
		<span class="drag-handle">≡</span>
		<button onclick="removeTask(event)">❌</button>
		<input type="text" placeholder="Task">
		<input type="number" placeholder="duration">
	`;

	BODY.taskList.appendChild(div);
	
	makeTaskDraggable(div);
	
	// Ajouter des event listeners pour sauvegarder quand les inputs changent
	// (mais pas de sauvegarde immédiate)
	const taskInput = div.children[2];
	const durationInput = div.children[3];
	
	taskInput.addEventListener('input', saveTasks);
	taskInput.addEventListener('blur', saveTasks);
	durationInput.addEventListener('input', saveTasks);
	durationInput.addEventListener('blur', saveTasks);

	return div;
}

function makeTaskDraggable(task) {
    let isDragging = false;
    let draggedElement = null;
    let startY = 0;
    let startMouseY = 0;
    let placeholder = null;
    let initialRect = null;

    const dragHandle = task.children[0]; // Le span avec "≡"
    dragHandle.classList.add('drag-handle');

    // Fonction pour créer un placeholder
    function createPlaceholder() {
        const ph = document.createElement('div');
        ph.classList.add('drag-placeholder');
        // Copier la hauteur de la tâche
        ph.style.height = task.offsetHeight + 'px';
        return ph;
    }

    // Fonction pour trouver l'élément le plus proche
    function getClosestTask(y) {
        const tasks = Array.from(BODY.taskList.children).filter(child => 
            !child.classList.contains('drag-placeholder') && child !== draggedElement
        );
        
        let closest = null;
        let closestDistance = Number.POSITIVE_INFINITY;

        tasks.forEach(child => {
            const rect = child.getBoundingClientRect();
            const childCenter = rect.top + rect.height / 2;
            const distance = Math.abs(y - childCenter);

            if (distance < closestDistance) {
                closest = child;
                closestDistance = distance;
            }
        });

        return closest;
    }

    // Fonction pour mettre à jour la position du placeholder
    function updatePlaceholderPosition(mouseY) {
        if (!placeholder) return;
        
        const closest = getClosestTask(mouseY);
        
        if (!closest) {
            // Placer à la fin si pas d'élément proche
            if (placeholder.parentNode === BODY.taskList) {
                return;
            }
            BODY.taskList.appendChild(placeholder);
            return;
        }

        const rect = closest.getBoundingClientRect();
        const middle = rect.top + rect.height / 2;

        if (mouseY < middle) {
            // Insérer avant l'élément le plus proche
            if (closest.previousElementSibling !== placeholder) {
                BODY.taskList.insertBefore(placeholder, closest);
            }
        } else {
            // Insérer après l'élément le plus proche
            const nextElement = closest.nextElementSibling;
            if (nextElement && nextElement !== placeholder) {
                BODY.taskList.insertBefore(placeholder, nextElement);
            } else if (!nextElement && BODY.taskList.lastElementChild !== placeholder) {
                BODY.taskList.appendChild(placeholder);
            }
        }
    }

    // Event listeners pour la souris
    function onMouseDown(e) {
        if (e.button !== 0) return; // Seulement le clic gauche

        isDragging = true;
        draggedElement = task;
        
        initialRect = task.getBoundingClientRect();
        startY = initialRect.top;
        startMouseY = e.clientY;

        // Créer et insérer le placeholder
        placeholder = createPlaceholder();
        task.parentNode.insertBefore(placeholder, task);

        // Appliquer les classes et styles nécessaires
        task.classList.add('task-dragging');
        document.body.classList.add('no-select');
        dragHandle.classList.add('grabbing');
        
        // Positionner l'élément avec les coordonnées exactes
        task.style.width = initialRect.width + 'px';
        task.style.left = initialRect.left + 'px';
        task.style.top = initialRect.top + 'px';
        
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        const deltaY = e.clientY - startMouseY;
        task.style.top = (startY + deltaY) + 'px';

        updatePlaceholderPosition(e.clientY);
        
        e.preventDefault();
    }

    function onMouseUp(e) {
        if (!isDragging) return;

        isDragging = false;
        
        // Nettoyer les classes et styles
        task.classList.remove('task-dragging');
        document.body.classList.remove('no-select');
        dragHandle.classList.remove('grabbing');
        
        // Supprimer les styles inline
        task.style.width = '';
        task.style.left = '';
        task.style.top = '';

        // Replacer l'élément à la position du placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(task, placeholder);
            placeholder.remove();
        }

        draggedElement = null;
        placeholder = null;
        initialRect = null;
        
        // Sauvegarder après déplacement
        saveTasks();
    }

    // Event listeners pour le tactile
    function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        isDragging = true;
        draggedElement = task;
        
        initialRect = task.getBoundingClientRect();
        startY = initialRect.top;
        startMouseY = touch.clientY;

        // Créer et insérer le placeholder
        placeholder = createPlaceholder();
        task.parentNode.insertBefore(placeholder, task);

        // Appliquer les classes et styles nécessaires
        task.classList.add('task-dragging');
        dragHandle.classList.add('grabbing');
        
        // Positionner l'élément avec les coordonnées exactes
        task.style.width = initialRect.width + 'px';
        task.style.left = initialRect.left + 'px';
        task.style.top = initialRect.top + 'px';

        e.preventDefault();
    }

    function onTouchMove(e) {
        if (!isDragging || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - startMouseY;
        task.style.top = (startY + deltaY) + 'px';

        updatePlaceholderPosition(touch.clientY);
        
        e.preventDefault();
    }

    function onTouchEnd(e) {
        if (!isDragging) return;

        isDragging = false;
        
        // Nettoyer les classes et styles
        task.classList.remove('task-dragging');
        dragHandle.classList.remove('grabbing');
        
        // Supprimer les styles inline
        task.style.width = '';
        task.style.left = '';
        task.style.top = '';

        // Replacer l'élément à la position du placeholder
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(task, placeholder);
            placeholder.remove();
        }

        draggedElement = null;
        placeholder = null;
        initialRect = null;
        
        // Sauvegarder après déplacement tactile
        saveTasks();
    }

    // Attacher les event listeners
    dragHandle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    dragHandle.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
}

function removeTask(event) {
	const div = event.target.parentElement;

	if (div != currentTask.element) {
		div.remove();
		// Sauvegarder après suppression
		saveTasks();
	}
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

// ===============================
// EVENT LISTENERS (MODIFIÉS)
// ===============================

BODY.start.onclick = () => {
	// Check already active
	if (currentTask.active)
		return;

	// Remove unused task
	for (let i = 0; i < BODY.taskList.children.length; i++) {
		const task = BODY.taskList.children[i];
		if (task.children[2].value == '' || task.children[3].value == '') {
			task.remove();
			i--;
		}
	}

	// Sauvegarder après nettoyage
	saveTasks();

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
	BODY.exit.classList.remove('hidden');
};

BODY.finish.onclick = finishTask;

BODY.addTime.onclick = () => {
	if (!currentTask.active || currentTask.paused)
		return;

	currentTask.finish += ADD_TIME * TIME_UNIT;
};

BODY.exit.onclick = () => {
	if (!currentTask.active)
		return;

	currentTask.element.children[1].innerText = '❌';
	currentTask.element.children[1].onclick = removeTask;
	stopTimer();
};

BODY.addTask.onclick = () => {
	addTask();
};

// ===============================
// INITIALISATION
// ===============================


// ===============================
// FONCTIONS DEBUG
// ===============================

function debugAddTasks(count) {
	saveTaskForbidden = true;
	
	for (let i = 0; i < count; i++) {
		const div = addTask();
		div.children[2].value = `Task #${i + 1}`;
		div.children[3].value = "0.1";
	}

	saveTaskForbidden = false;
	saveTasks();
}

loadTasks();