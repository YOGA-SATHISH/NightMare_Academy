// Game State
let currentState = {
    domain: null, // 'web', 'db', 'net', 'os', 'ai'
    difficulty: null, // 'easy', 'medium', 'hard'
    maxLives: 3,
    level: 1, // 1 to 5
    questionIndex: 0, // 0 to 2 for current level
    lives: 3
};

// Ghost appearances per level (we use CSS filter adjustments on a base image)
const ghostHues = [0, 90, 150, 220, 280];

// Questions are now loaded from js/questions.js and js/data/*

function getCurrentQuestionData() {
    const totalQIdx = (currentState.level - 1) * 3 + currentState.questionIndex;
    return gameTriviaQuestions[currentState.difficulty][currentState.domain][totalQIdx];
}

// UI Handling 
function showScreen(id) {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    setTimeout(() => {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const screen = document.getElementById(id);
        screen.classList.remove('hidden');
        setTimeout(() => screen.classList.add('active'), 50);
    }, 500); // fade time
}

function triggerJumpScare() {
    const scareStr = document.getElementById("scare-screen");
    scareStr.classList.remove("hidden");
    setTimeout(() => scareStr.classList.add("active"), 10);
    
    setTimeout(() => {
        scareStr.classList.remove("active");
        setTimeout(() => scareStr.classList.add("hidden"), 200);
    }, 400); // scare duration
}

function speakHorror(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let spell = new SpeechSynthesisUtterance(text);
        spell.pitch = 0.1;
        spell.rate = 0.8;
        spell.volume = 1;
        
        // Duck the BGM music so the voice is loud
        const bgm = document.getElementById('horror-bgm');
        if (bgm) bgm.volume = 0.15;
        
        spell.onend = function() {
            if (bgm) bgm.volume = 0.5;
        };
        
        const voices = window.speechSynthesis.getVoices();
        const deepVoice = voices.find(v => v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('male'));
        if (deepVoice) spell.voice = deepVoice;
        
        window.speechSynthesis.speak(spell);
    }
}

// Pre-load voices to avoid silent first-try
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function typeWriterEffect(element, text, speed = 50, callback = null) {
    element.innerHTML = '';
    let i = 0;
    
    if (element.typewriterInterval) clearInterval(element.typewriterInterval);
    
    element.typewriterInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(element.typewriterInterval);
            if (callback) callback();
        }
    }, speed);
}

function updateGhostColors() {
    const hue = ghostHues[currentState.level - 1];
    document.getElementById('intro-ghost-img').style.filter = `hue-rotate(${hue}deg) grayscale(50%) contrast(120%) brightness(100%) drop-shadow(0 0 20px var(--sickly-green))`;
    document.getElementById('quiz-ghost-img').style.filter = `hue-rotate(${hue}deg) grayscale(50%) opacity(0.5) blur(1px)`;
    // Removed invert(100%) to keep the 'Failed' ghost features visible
    document.getElementById('lesson-ghost-img').style.filter = `grayscale(100%) sepia(100%) hue-rotate(300deg) contrast(150%) brightness(80%) drop-shadow(0 0 40px red)`;
    
    // Change environment tint 
    document.getElementById('fog-layer').style.filter = `sepia(100%) hue-rotate(${hue + 40}deg) blur(5px)`;
    document.querySelectorAll('.soul').forEach(soul => {
        soul.style.filter = `hue-rotate(${hue}deg) blur(2px)`;
    });
}

// Emits ambient floating particles
function spawnSouls() {
    const container = document.getElementById('souls-container');
    setInterval(() => {
        const soul = document.createElement('div');
        soul.classList.add('soul');
        soul.style.left = Math.random() * 100 + 'vw';
        soul.style.animationDuration = (Math.random() * 4 + 3) + 's'; // 3 to 7 seconds
        
        // Match current level hue if game is active
        const currentHue = currentState.level ? ghostHues[currentState.level - 1] : 0;
        soul.style.filter = `hue-rotate(${currentHue}deg) blur(2px)`;
        
        container.appendChild(soul);
        
        // Remove after animation completes
        setTimeout(() => soul.remove(), 7000);
    }, 400); // spawn a new soul every 400ms
}

// Start ambient background
spawnSouls();

// Game Flow
function startGame(difficulty) {
    currentState.domain = document.getElementById('domain-select').value;
    currentState.difficulty = difficulty;
    
    // All difficulties have exactly 3 lives
    currentState.maxLives = 3;
    
    currentState.level = 1;
    currentState.questionIndex = 0;
    currentState.lives = currentState.maxLives;
    
    document.getElementById('home-btn').classList.remove('hidden');
    document.getElementById('global-hud').classList.remove('hidden');
    
    // Play the atmospheric horror music
    const bgm = document.getElementById('horror-bgm');
    if (bgm) {
        bgm.volume = 0.5;
        bgm.play().catch(e => console.log("BGM Autoplay prevented:", e));
    }
    
    triggerJumpScare();
    setTimeout(() => prepareLevel(), 500);
}

function returnToHome() {
    currentState.domain = null;
    document.getElementById('home-btn').classList.add('hidden');
    document.getElementById('global-hud').classList.add('hidden');
    
    // Reset fog and soul tints to default
    document.getElementById('fog-layer').style.filter = `sepia(100%) hue-rotate(100deg) blur(5px)`;
    
    // Stop the background music
    const bgm = document.getElementById('horror-bgm');
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
    }
    
    showScreen('login-screen');
}

function goBack() {
    if (document.getElementById('quiz-screen').classList.contains('active')) {
        showScreen('puzzle-screen');
    } else if (document.getElementById('puzzle-screen').classList.contains('active')) {
        showScreen('intro-screen');
    } else if (document.getElementById('intro-screen').classList.contains('active')) {
        returnToHome();
    }
}

function prepareLevel() {
    if (currentState.level > 5) {
        document.getElementById('global-hud').classList.add('hidden');
        showScreen('win-screen');
        return;
    }
    currentState.questionIndex = 0;
    currentState.lives = currentState.maxLives;
    
    document.getElementById('intro-level-title').innerText = `Level ${currentState.level} : ${currentState.domain.toUpperCase()}`;
    
    // Set matching ghost image
    const ghostNum = currentState.level <= 5 ? currentState.level : 5; // Use 5th ghost for level 5
    const ghostSrc = `images/ghost${ghostNum}.jpg.jpeg`;
    
    document.getElementById('intro-ghost-img').src = ghostSrc;
    document.getElementById('quiz-ghost-img').src = ghostSrc;
    document.getElementById('lesson-ghost-img').src = ghostSrc;

    const iElem = document.getElementById('intro-text');
    iElem.innerHTML = ''; // Clear for animation
    
    updateGhostColors();
    showScreen('intro-screen');
    
    setTimeout(() => typeWriterEffect(iElem, "I am the guardian of this knowledge...", 50), 500);
}

// --- PUZZLE LOGIC ---
let puzzleState = [];
let selectedTile = null;

function startPuzzle() {
    showScreen('puzzle-screen');
    // Map to puzzle1.jpg through puzzle15.jpg based on Level (1-5) and Question (0-2)
    const puzzleNum = (currentState.level - 1) * 3 + currentState.questionIndex + 1;
    const jpegPuzzles = [6, 7, 8, 9, 10, 11];
    const extension = jpegPuzzles.includes(puzzleNum) ? '.jpg.jpeg' : '.jpg';
    const imgSrc = `images/puzzle${puzzleNum}${extension}`;
    
    document.getElementById('puzzle-ref-img').src = imgSrc;
    
    const pElem = document.getElementById('puzzle-instruction-text');
    pElem.innerHTML = '';
    setTimeout(() => typeWriterEffect(pElem, "Swap the fragmented pieces to reveal the anomaly before it asks its question...", 35), 500);

    puzzleState = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    do {
        for (let i = puzzleState.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [puzzleState[i], puzzleState[j]] = [puzzleState[j], puzzleState[i]];
        }
    } while (isPuzzleSolved()); // Ensure it's shuffled

    selectedTile = null;
    renderPuzzle(imgSrc);
}

function isPuzzleSolved() {
    for(let i=0; i<9; i++) {
        if (puzzleState[i] !== i) return false;
    }
    return true;
}

function renderPuzzle(imgSrc) {
    const grid = document.getElementById('puzzle-grid');
    grid.innerHTML = '';
    
    puzzleState.forEach((pos, index) => {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.style.backgroundImage = `url('${imgSrc}')`;
        
        const origX = (pos % 3) * 100;
        const origY = Math.floor(pos / 3) * 100;
        tile.style.backgroundPosition = `-${origX}px -${origY}px`;
        tile.style.filter = `contrast(110%) brightness(90%)`;
        
        if (selectedTile === index) {
            tile.style.border = "2px solid red";
            tile.style.transform = "scale(0.9)";
        }

        tile.onclick = () => handleTileClick(index, imgSrc);
        grid.appendChild(tile);
    });
}

function handleTileClick(index, imgSrc) {
    if (selectedTile === null) {
        selectedTile = index;
    } else {
        const temp = puzzleState[selectedTile];
        puzzleState[selectedTile] = puzzleState[index];
        puzzleState[index] = temp;
        selectedTile = null;
    }
    renderPuzzle(imgSrc);
    
    if (isPuzzleSolved()) {
        setTimeout(() => {
            startQuiz();
        }, 500);
    }
}
// --- END PUZZLE LOGIC ---

function startQuiz() {
    showScreen('quiz-screen');
    renderHUD();
    loadQuestion();
}

function renderHUD() {
    document.getElementById('hud-level').innerText = currentState.level;
    const lost = 3 - currentState.lives;
    document.getElementById('lives-display').innerText = `Remaining: ${currentState.lives} | Lost: ${lost}`;
}

function loadQuestion() {
    const qData = getCurrentQuestionData();
    const qElem = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    
    optionsContainer.innerHTML = '';
    optionsContainer.classList.add('hidden'); // Hide options until typed
    
    typeWriterEffect(qElem, qData.q, 45, () => {
        qData.opts.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(idx);
            optionsContainer.appendChild(btn);
        });
        optionsContainer.classList.remove('hidden');
    });
}

function checkAnswer(selectedIdx) {
    const qData = getCurrentQuestionData();
    
    if (selectedIdx === qData.ans) {
        // Correct
        speakHorror("Correct.");
        document.body.style.backgroundColor = '#050';
        setTimeout(() => document.body.style.backgroundColor = 'var(--bg-dark)', 200);
        
        currentState.questionIndex++;
        if (currentState.questionIndex >= 3) {
            // Level complete
            triggerJumpScare();
            currentState.level++;
            setTimeout(() => prepareLevel(), 1000);
        } else {
            // Trigger the puzzle again before the next question!
            startPuzzle();
        }
    } else {
        // Wrong
        speakHorror("Wrong.");
        loseLife();
    }
}

function loseLife() {
    currentState.lives--;
    renderHUD();
    
    // Flashing effect
    document.body.style.backgroundColor = '#500';
    setTimeout(() => document.body.style.backgroundColor = 'var(--bg-dark)', 200);
    
    if (currentState.lives <= 0) {
        // Show lesson only when completely out of lives
        setTimeout(() => showLesson(), 500);
    } else {
        // Optional quick scare on failure if they still have lives
        if(Math.random() > 0.5) triggerJumpScare();
    }
}

function showLesson() {
    // Fetch the specific lesson for this exact question!
    const qData = getCurrentQuestionData();
    const lessonTxt = qData.lesson;
    
    const lElem = document.getElementById('lesson-text');
    lElem.innerHTML = '';
    
    const titleElem = document.getElementById('lesson-title');
    titleElem.innerText = "YOU FAILED";
    titleElem.dataset.text = "YOU FAILED";
    
    showScreen('lesson-screen');
    speakHorror(lessonTxt);
    setTimeout(() => typeWriterEffect(lElem, lessonTxt, 40), 500);
}

function handleLessonConfirm() {
    // Restore exactly 1 life after reading the lesson
    currentState.lives = 1;
    renderHUD();
    
    // Send them back to the exact same question they failed on!
    showScreen('quiz-screen');
}

function restartLevel() {
    handleLessonConfirm();
}

// Start BGM on first interaction
document.addEventListener('click', function initBGM() {
    const bgm = document.getElementById('horror-bgm');
    if (bgm && bgm.paused) {
        bgm.volume = 0.5;
        bgm.play().catch(e => console.log("Init BGM prevented:", e));
    }
    document.removeEventListener('click', initBGM);
}, { once: true });
