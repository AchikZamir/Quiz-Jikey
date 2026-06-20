/**
 * Quiz Jikey — Main Application
 */
const STORAGE_KEY = 'quizJikeyProgress';

const state = {
  currentTopic: null,
  currentQuestionIndex: 0,
  correctCount: 0,
  answered: false,
  progress: loadProgress()
};

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return { topics: {}, totalEarned: 0, maxPossible: 0 };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function initProgress() {
  const maxPossible = QUIZ_TOPICS.reduce((sum, t) => sum + t.maxPoints, 0);
  state.progress.maxPossible = maxPossible;

  QUIZ_TOPICS.forEach(topic => {
    if (!state.progress.topics[topic.id]) {
      state.progress.topics[topic.id] = {
        bestScore: 0,
        passed: false,
        perfect: false,
        pointsEarned: 0,
        attempts: 0
      };
    }
  });

  recalculateProgress();
  saveProgress();
}

function calcTopicPoints(topicId, bestScore) {
  const topic = QUIZ_TOPICS.find(t => t.id === topicId);
  if (!topic || bestScore <= 0) return 0;
  return Math.round((bestScore / 100) * topic.maxPoints);
}

function recalculateProgress() {
  let total = 0;
  QUIZ_TOPICS.forEach(topic => {
    const tp = getTopicProgress(topic.id);
    tp.pointsEarned = calcTopicPoints(topic.id, tp.bestScore);
    tp.passed = tp.bestScore >= topic.passThreshold;
    tp.perfect = tp.bestScore === 100;
    state.progress.topics[topic.id] = tp;
    total += tp.pointsEarned;
  });
  state.progress.totalEarned = total;
}

function updateTopicProgress(topicId, scorePercent) {
  const topic = QUIZ_TOPICS.find(t => t.id === topicId);
  const tp = getTopicProgress(topicId);

  tp.bestScore = Math.max(tp.bestScore, scorePercent);
  tp.attempts += 1;
  tp.pointsEarned = calcTopicPoints(topicId, tp.bestScore);
  tp.passed = tp.bestScore >= topic.passThreshold;
  tp.perfect = tp.bestScore === 100;

  state.progress.topics[topicId] = tp;
  recalculateProgress();
  saveProgress();
}

function getTopicProgress(topicId) {
  return state.progress.topics[topicId] || {
    bestScore: 0, passed: false, perfect: false, pointsEarned: 0, attempts: 0
  };
}

function getTotalScorePercent() {
  if (!state.progress.maxPossible) return 0;
  return Math.round((state.progress.totalEarned / state.progress.maxPossible) * 100);
}

function isPerfectProfile() {
  return QUIZ_TOPICS.every(t => {
    const tp = getTopicProgress(t.id);
    return tp.passed && tp.bestScore === 100;
  });
}

function allTopicsPassed() {
  return QUIZ_TOPICS.every(t => getTopicProgress(t.id).passed);
}

/* ===== VIEWS ===== */
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

  if (viewName === 'topics') renderTopics();
  if (viewName === 'profile') renderProfile();
  if (viewName === 'home') updateHeroStats();
}

/* ===== RENDER TOPICS ===== */
function renderTopics() {
  const grid = document.getElementById('topicsGrid');
  grid.innerHTML = '';

  QUIZ_TOPICS.forEach(topic => {
    const tp = getTopicProgress(topic.id);
    const card = document.createElement('article');
    card.className = 'topic-card';
    if (tp.perfect) card.classList.add('perfect');
    else if (tp.passed) card.classList.add('passed');
    card.style.setProperty('--topic-color', topic.color);

    let badge = '<span class="topic-badge badge-new">Main</span>';
    if (tp.perfect) badge = '<span class="topic-badge badge-perfect">★ Sempurna</span>';
    else if (tp.passed) badge = '<span class="topic-badge badge-passed">✓ Lulus</span>';

    card.innerHTML = `
      <div class="topic-header">
        <span class="topic-icon">${topic.icon}</span>
        ${badge}
      </div>
      <h3>${topic.name}</h3>
      <p class="topic-desc">${topic.description}</p>
      <div class="topic-meta">
        <span>${topic.questions.length} soalan</span>
        <span>Lulus: ${topic.passThreshold}%</span>
      </div>
      <div class="topic-progress-bar">
        <div class="topic-progress-fill" style="width: ${tp.bestScore}%"></div>
      </div>
      <p class="topic-points">${tp.pointsEarned}/${topic.maxPoints} mata diperoleh</p>
    `;

    card.addEventListener('click', () => startQuiz(topic.id));
    grid.appendChild(card);
  });
}

/* ===== RENDER PROFILE ===== */
function renderProfile() {
  const totalPct = getTotalScorePercent();
  const perfect = isPerfectProfile();
  const passed = allTopicsPassed();
  const earned = state.progress.totalEarned || 0;
  const maxPts = state.progress.maxPossible || 0;

  document.getElementById('totalScorePercent').textContent = `${totalPct}%`;
  document.getElementById('totalPointsDetail').textContent = `${earned} / ${maxPts} mata`;

  const ring = document.getElementById('ringFill');
  const circumference = 327;
  const offset = circumference - (totalPct / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = perfect
    ? '#C5A028'
    : 'url(#ringGradient)';

  if (!document.getElementById('ringGradient')) {
    const svg = document.querySelector('.score-ring');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7B1E3A"/>
        <stop offset="100%" stop-color="#C5A028"/>
      </linearGradient>
    `;
    svg.insertBefore(defs, svg.firstChild);
  }

  const badge = document.getElementById('perfectBadge');
  const status = document.getElementById('profileStatus');
  const avatar = document.getElementById('profileAvatar');

  if (perfect) {
    badge.classList.remove('hidden');
    status.textContent = 'Hebat! Anda capai skor SEMPURNA pada semua topik — seperti persembahan Jikey yang sempurna!';
    avatar.textContent = '👑';
  } else if (passed) {
    badge.classList.add('hidden');
    status.textContent = 'Semua topik lulus! Kejar 100% pada setiap topik untuk status Sempurna.';
    avatar.textContent = '🏆';
  } else {
    badge.classList.add('hidden');
    const passedCount = QUIZ_TOPICS.filter(t => getTopicProgress(t.id).passed).length;
    status.textContent = `${passedCount}/${QUIZ_TOPICS.length} topik lulus. Teruskan usaha!`;
    avatar.textContent = '🎭';
  }

  const breakdown = document.getElementById('profileBreakdown');
  breakdown.innerHTML = '';

  QUIZ_TOPICS.forEach(topic => {
    const tp = getTopicProgress(topic.id);
    let scoreClass = 'failed';
    let scoreText = `${tp.bestScore}%`;

    if (tp.perfect) { scoreClass = 'perfect'; scoreText = '100% ★'; }
    else if (tp.passed) { scoreClass = 'passed'; }

    const item = document.createElement('div');
    item.className = 'breakdown-item';
    item.innerHTML = `
      <span class="breakdown-icon">${topic.icon}</span>
      <div class="breakdown-info">
        <strong>${topic.name}</strong>
        <span>${tp.pointsEarned}/${topic.maxPoints} mata · ${tp.attempts} percubaan</span>
      </div>
      <span class="breakdown-score ${scoreClass}">${scoreText}</span>
    `;
    breakdown.appendChild(item);
  });
}

function updateHeroStats() {
  document.getElementById('heroTopicCount').textContent = QUIZ_TOPICS.length;
  document.getElementById('heroPassedCount').textContent =
    QUIZ_TOPICS.filter(t => getTopicProgress(t.id).passed).length;

  const perfectEl = document.getElementById('heroPerfectBadge');
  if (isPerfectProfile()) {
    perfectEl.textContent = '★ YA';
    perfectEl.style.color = '#9A7B1A';
  } else {
    perfectEl.textContent = `${getTotalScorePercent()}%`;
    perfectEl.style.color = '';
  }
}

/* ===== QUIZ LOGIC ===== */
function startQuiz(topicId) {
  const topic = QUIZ_TOPICS.find(t => t.id === topicId);
  if (!topic || !topic.questions.length) return;

  AudioEngine.playSfx('click');

  state.currentTopic = topic;
  state.currentQuestionIndex = 0;
  state.correctCount = 0;
  state.answered = false;

  document.getElementById('quizTopicIcon').textContent = topic.icon;
  document.getElementById('quizTopicTitle').textContent = topic.name;
  document.getElementById('passThreshold').textContent = `${topic.passThreshold}%`;
  document.getElementById('liveScore').textContent = '0';

  document.getElementById('questionCard').classList.remove('hidden');
  document.getElementById('quizFeedback').classList.add('hidden');
  document.getElementById('quizResults').classList.add('hidden');

  document.getElementById('quizOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  showQuestion();
}

function showQuestion() {
  const topic = state.currentTopic;
  const q = topic.questions[state.currentQuestionIndex];
  const total = topic.questions.length;
  const current = state.currentQuestionIndex + 1;

  state.answered = false;

  document.getElementById('quizProgress').textContent = `Soalan ${current} daripada ${total}`;
  document.getElementById('quizProgressFill').style.width = `${((current - 1) / total) * 100}%`;
  document.getElementById('questionNumber').textContent = `S${current}`;
  document.getElementById('questionText').textContent = q.question;

  const letters = ['A', 'B', 'C', 'D'];
  const grid = document.getElementById('answersGrid');
  grid.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.innerHTML = `<span class="answer-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => selectAnswer(i, btn));
    grid.appendChild(btn);
  });

  document.getElementById('questionCard').classList.remove('hidden');
  document.getElementById('quizFeedback').classList.add('hidden');
}

function selectAnswer(index, btn) {
  if (state.answered) return;
  state.answered = true;

  const topic = state.currentTopic;
  const q = topic.questions[state.currentQuestionIndex];
  const isCorrect = index === q.correct;
  const buttons = document.querySelectorAll('.answer-btn');

  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add('correct');
    else if (i === index && !isCorrect) b.classList.add('wrong');
    else b.classList.add('dimmed');
  });

  if (isCorrect) {
    state.correctCount++;
    AudioEngine.playSfx('correct');
  } else {
    AudioEngine.playSfx('wrong');
  }

  const total = topic.questions.length;
  const livePct = Math.round((state.correctCount / total) * 100);
  document.getElementById('liveScore').textContent = `${state.correctCount}/${total} (${livePct}%)`;

  setTimeout(() => showFeedback(isCorrect), 600);
}

function showFeedback(isCorrect) {
  document.getElementById('questionCard').classList.add('hidden');
  const feedback = document.getElementById('quizFeedback');
  feedback.classList.remove('hidden');

  const icon = document.getElementById('feedbackIcon');
  const text = document.getElementById('feedbackText');
  const nextBtn = document.getElementById('nextQuestionBtn');

  if (isCorrect) {
    icon.textContent = '✓';
    icon.className = 'feedback-icon correct';
    text.textContent = 'Tepat! Bagus sekali!';
  } else {
    icon.textContent = '✕';
    icon.className = 'feedback-icon wrong';
    text.textContent = 'Hampir! Jangan putus asa, cuba lagi.';
  }

  const isLast = state.currentQuestionIndex >= state.currentTopic.questions.length - 1;
  nextBtn.textContent = isLast ? 'Lihat Keputusan' : 'Soalan Seterusnya';

  nextBtn.onclick = () => {
    AudioEngine.playSfx('click');
    if (isLast) {
      finishQuiz();
    } else {
      state.currentQuestionIndex++;
      showQuestion();
    }
  };
}

function finishQuiz() {
  const topic = state.currentTopic;
  const total = topic.questions.length;
  const scorePercent = Math.round((state.correctCount / total) * 100);
  const passed = scorePercent >= topic.passThreshold;
  const perfect = scorePercent === 100;

  updateTopicProgress(topic.id, scorePercent);

  document.getElementById('quizFeedback').classList.add('hidden');
  document.getElementById('quizResults').classList.remove('hidden');
  document.getElementById('quizProgressFill').style.width = '100%';

  const trophy = document.getElementById('resultsTrophy');
  const title = document.getElementById('resultsTitle');
  const scoreText = document.getElementById('resultsScoreText');
  const message = document.getElementById('resultsMessage');

  if (perfect) {
    trophy.textContent = '🌟';
    title.textContent = 'Skor SEMPURNA!';
    AudioEngine.playSfx('perfect');
    launchConfetti();
  } else if (passed) {
    trophy.textContent = '🏆';
    title.textContent = 'Topik Lulus!';
    AudioEngine.playSfx('win');
    launchConfetti();
  } else {
    trophy.textContent = '💪';
    title.textContent = 'Teruskan Usaha!';
    AudioEngine.playSfx('click');
  }

  scoreText.textContent = `Anda dapat ${scorePercent}% (${state.correctCount}/${total})`;

  if (perfect) {
    message.textContent = `Cemerlang! ${topic.maxPoints} mata penuh untuk ${topic.name} diperoleh.`;
  } else if (passed) {
    const pts = calcTopicPoints(topic.id, scorePercent);
    message.textContent = `Tahniah, lulus! ${pts} mata ditambah ke profil (ikut skor ${scorePercent}%). Sasarkan 100% pada percubaan seterusnya!`;
  } else {
    const pts = calcTopicPoints(topic.id, scorePercent);
    message.textContent = pts > 0
      ? `Anda perlukan ${topic.passThreshold}% untuk lulus. ${pts} mata direkod ikut skor anda. Cuba lagi!`
      : `Anda perlukan ${topic.passThreshold}% untuk lulus. Ulangkaji & cuba lagi!`;
  }

  if (isPerfectProfile()) {
    setTimeout(() => {
      launchConfetti();
      AudioEngine.playSfx('perfect');
    }, 800);
  }

  updateHeroStats();
}

function closeQuiz() {
  document.getElementById('quizOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  state.currentTopic = null;
}

/* ===== CONFETTI ===== */
function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#7B1E3A', '#C5A028', '#1A5C4B', '#B85C38', '#9B2D4E', '#E8C84A'];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = piece.style.width;
    container.appendChild(piece);

    setTimeout(() => piece.remove(), 4000);
  }
}

/* ===== RESET & SYNC ===== */
function exportProgress() {
  const data = JSON.stringify(state.progress, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz-jikey-kemajuan.json';
  a.click();
  URL.revokeObjectURL(url);
  AudioEngine.playSfx('click');
}

function importProgress() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported.topics) throw new Error('invalid');
        state.progress = imported;
        initProgress();
        renderProfile();
        updateHeroStats();
        alert('Kemajuan berjaya dimuat naik!');
        AudioEngine.playSfx('win');
      } catch (_) {
        alert('Fail tidak sah. Sila pilih fail quiz-jikey-kemajuan.json yang dieksport.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetProgress() {
  if (!confirm('Set semula semua kemajuan? Tindakan ini tidak boleh dibatalkan.')) return;
  state.progress = { topics: {}, totalEarned: 0, maxPossible: 0 };
  initProgress();
  renderProfile();
  updateHeroStats();
  AudioEngine.playSfx('click');
}

/* ===== INIT ===== */
function init() {
  initProgress();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioEngine.playSfx('click');
      switchView(btn.dataset.view);
    });
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    AudioEngine.playSfx('click');
    switchView('topics');
  });

  document.getElementById('closeQuiz').addEventListener('click', () => {
    AudioEngine.playSfx('click');
    closeQuiz();
  });

  document.getElementById('backToTopics').addEventListener('click', () => {
    AudioEngine.playSfx('click');
    closeQuiz();
    switchView('topics');
  });

  document.getElementById('retryTopic').addEventListener('click', () => {
    if (state.currentTopic) startQuiz(state.currentTopic.id);
  });

  document.getElementById('resetProgress').addEventListener('click', resetProgress);
  document.getElementById('exportProgress').addEventListener('click', exportProgress);
  document.getElementById('importProgress').addEventListener('click', importProgress);

  AudioEngine.initAudio();

  document.getElementById('musicToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    AudioEngine.onMusicButtonClick();
    AudioEngine.playSfx('click');
  });

  document.getElementById('sfxToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const on = AudioEngine.toggleSfx();
    if (on) AudioEngine.playSfx('click');
  });

  AudioEngine.resumeOnInteraction();
  updateHeroStats();
}

document.addEventListener('DOMContentLoaded', init);
