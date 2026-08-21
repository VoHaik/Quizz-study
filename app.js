/**
 * MLN122 - Web App Engine for Overnight Cramming
 * Multiple Choice Learning & Exam Simulator
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Global State
  let allQuestions = [];
  let currentMode = 'quick'; // 'quick', 'flashcard', 'mistakes', 'exam', 'bank'
  let activeQuestions = [];
  let currentIndex = 0;
  let selectedOption = null;
  let isShuffleOn = false;

  // Stable cache for shuffled questions so order remains FIXED during navigation
  let shuffledCache = {
    key: null,
    list: []
  };

  // Track current question index per mode so switching tabs preserves position
  let modeIndices = {
    quick: 0,
    flashcard: 0,
    mistakes: 0
  };

  // Sound Synth via Web Audio API
  let audioCtx = null;
  let soundEnabled = true;

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(130.81, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'flip') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  }

  // Shuffle Utility Functions
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getQuestionWithOptionsShuffled(q) {
    const optsWithOrigKey = q.options.map(o => ({
      originalKey: o.key,
      text: o.text
    }));

    const shuffledOpts = shuffleArray(optsWithOrigKey);

    const keys = ['A', 'B', 'C', 'D', 'E'];
    const newCorrectAnswers = [];

    const newOptions = shuffledOpts.map((opt, idx) => {
      const newKey = keys[idx];
      if (q.correctAnswers.includes(opt.originalKey)) {
        newCorrectAnswers.push(newKey);
      }
      return {
        key: newKey,
        text: opt.text
      };
    });

    return {
      ...q,
      options: newOptions,
      correctAnswers: newCorrectAnswers
    };
  }

  // User Progress Storage
  let progress = {
    answered: {},     // qId -> { selectedKey: "A", isCorrect: true/false }
    starred: {},      // qId -> true
    mistakes: {},     // qId -> count
    lastQuickIndex: 0,
    isShuffleOn: false
  };

  // Subject Presets & Multi-Subject State
  const SUBJECT_PRESETS = {
    mln122: {
      key: 'mln122',
      title: 'MLN122 - Ôn Thi Siêu Tốc',
      subtitle: 'Học thuộc lòng câu hỏi trắc nghiệm Kinh tế chính trị',
      file: 'data.md'
    },
    ite302c: {
      key: 'ite302c',
      title: 'ITE302c - Ethics in AI & Data Science',
      subtitle: 'Học thuộc lòng câu hỏi trắc nghiệm (Chuẩn Nhung Hoàng)',
      file: 'ite302c_data.md'
    }
  };

  let currentSubjectKey = localStorage.getItem('CURRENT_SUBJECT_KEY') || 'mln122';

  function loadProgress() {
    try {
      const savedKey = `PROGRESS_${currentSubjectKey}`;
      const saved = localStorage.getItem(savedKey) || (currentSubjectKey === 'mln122' ? localStorage.getItem('MLN122_PROGRESS') : null);
      if (saved) {
        progress = Object.assign({
          answered: {},
          starred: {},
          mistakes: {},
          lastQuickIndex: 0,
          isShuffleOn: false
        }, JSON.parse(saved));
        if (typeof progress.lastQuickIndex === 'number') {
          modeIndices.quick = progress.lastQuickIndex;
        }
        if (typeof progress.isShuffleOn === 'boolean') {
          isShuffleOn = progress.isShuffleOn;
        }
      } else {
        progress = {
          answered: {},
          starred: {},
          mistakes: {},
          lastQuickIndex: 0,
          isShuffleOn: false
        };
      }
    } catch (e) {
      console.error(e);
    }
    updateShuffleUI();
  }

  function saveProgress() {
    try {
      progress.lastQuickIndex = modeIndices.quick;
      progress.isShuffleOn = isShuffleOn;
      localStorage.setItem(`PROGRESS_${currentSubjectKey}`, JSON.stringify(progress));
      updateGlobalStats();
    } catch (e) {
      console.error(e);
    }
  }

  function updateShuffleUI() {
    const btn = document.getElementById('shuffleToggle');
    const status = document.getElementById('shuffleStatus');
    if (status && btn) {
      status.textContent = isShuffleOn ? 'Xáo trộn: BẬT' : 'Xáo trộn: TẮT';
      btn.style.background = isShuffleOn ? 'linear-gradient(135deg, var(--primary), var(--accent-purple))' : '';
      btn.style.color = isShuffleOn ? '#fff' : '';
    }
  }

  // Exam State
  let examState = {
    questions: [],
    userAnswers: {},
    timerSeconds: 40 * 60,
    intervalId: null,
    isSubmitted: false
  };

  // Load subject data (Preset or Custom)
  async function loadSubjectData(key, rawContent = null, customTitle = null) {
    try {
      currentSubjectKey = key;
      localStorage.setItem('CURRENT_SUBJECT_KEY', key);

      let textToParse = rawContent;
      let title = "MLN122 - Ôn Thi Siêu Tốc";
      let subtitle = "Học thuộc lòng câu hỏi trắc nghiệm Kinh tế chính trị";

      if (SUBJECT_PRESETS[key]) {
        title = SUBJECT_PRESETS[key].title;
        subtitle = SUBJECT_PRESETS[key].subtitle;
        const resp = await fetch(SUBJECT_PRESETS[key].file);
        if (!resp.ok) throw new Error(`Could not load ${SUBJECT_PRESETS[key].file}`);
        textToParse = await resp.text();
      } else if (key === 'custom') {
        if (!textToParse) {
          textToParse = localStorage.getItem('CUSTOM_SUBJECT_RAW') || '';
        } else {
          localStorage.setItem('CUSTOM_SUBJECT_RAW', textToParse);
        }
        if (customTitle) {
          localStorage.setItem('CUSTOM_SUBJECT_TITLE', customTitle);
        }
        title = localStorage.getItem('CUSTOM_SUBJECT_TITLE') || "Bộ Đề Import Tùy Chỉnh";
        subtitle = "Học thuộc lòng câu hỏi trắc nghiệm đã import";
      }

      if (!textToParse) {
        throw new Error("Chưa có dữ liệu bộ đề để nạp. Hãy chọn hoặc import file mới!");
      }

      const parsed = parseInputToQuestions(textToParse);
      if (!parsed || parsed.length === 0) {
        throw new Error("Không tìm thấy câu hỏi hợp lệ trong dữ liệu!");
      }

      allQuestions = parsed;

      // Update Header Titles
      const titleEl = document.querySelector('.brand-title');
      const subEl = document.querySelector('.brand-subtitle');
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = `${subtitle} (${allQuestions.length} câu)`;
      document.title = `${title} - Ôn Thi Siêu Tốc`;

      loadProgress();
      populateRangeSelector();
      modeIndices = { quick: 0, flashcard: 0, mistakes: 0 };
      switchMode('quick');
      updateGlobalStats();
      console.log(`Successfully loaded ${allQuestions.length} questions for subject: ${key}`);
    } catch (err) {
      console.error('Error loading subject:', err);
      alert('Lỗi nạp bộ đề: ' + err.message);
    }
  }

  async function initData() {
    await loadSubjectData(currentSubjectKey);
  }

  // Populate Range Dropdown dynamically
  function populateRangeSelector() {
    const sel = document.getElementById('rangeSelect');
    const customBox = document.getElementById('customRangeBox');
    if (!sel) return;

    sel.innerHTML = `<option value="all">Toàn bộ ${allQuestions.length} câu</option>`;

    const chunkSize = 50;
    for (let i = 0; i < allQuestions.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, allQuestions.length);
      const startNum = i + 1;
      const endNum = end;
      const opt = document.createElement('option');
      opt.value = `${startNum}-${endNum}`;
      opt.textContent = `Câu ${startNum} - ${endNum}`;
      sel.appendChild(opt);
    }

    const multiSelectCount = allQuestions.filter(q => (q.correctAnswers && q.correctAnswers.length >= 2) || q.question.toLowerCase().includes('select two') || q.question.toLowerCase().includes('select 2')).length;
    if (multiSelectCount > 0) {
      const multiOpt = document.createElement('option');
      multiOpt.value = 'multi_select';
      multiOpt.textContent = `✌️ Câu hỏi chọn 2 đáp án (${multiSelectCount} câu)`;
      sel.appendChild(multiOpt);
    }

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '⚙️ Tùy chỉnh (Nhập dải câu...)';
    sel.appendChild(customOpt);

    sel.onchange = () => {
      if (sel.value === 'custom') {
        if (customBox) customBox.style.display = 'flex';
      } else {
        if (customBox) customBox.style.display = 'none';
        filterActiveQuestions(true, true);
      }
    };

    const multiSelectBtn = document.getElementById('multiSelectBtn');
    if (multiSelectBtn) {
      multiSelectBtn.onclick = () => {
        if (sel) {
          sel.value = 'multi_select';
          if (customBox) customBox.style.display = 'none';
          filterActiveQuestions(true, true);
        }
      };
    }

    const applyBtn = document.getElementById('applyCustomRangeBtn');
    if (applyBtn) {
      applyBtn.onclick = () => {
        filterActiveQuestions(true, true);
      };
    }

    const cStart = document.getElementById('customStart');
    const cEnd = document.getElementById('customEnd');

    if (cStart) cStart.max = allQuestions.length;
    if (cEnd) {
      cEnd.max = allQuestions.length;
      cEnd.value = Math.min(150, allQuestions.length);
    }

    [cStart, cEnd].forEach(input => {
      if (input) {
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            filterActiveQuestions(true, true);
          }
        };
      }
    });
  }

  function filterActiveQuestions(resetIndex = false, forceReshuffle = false) {
    const sel = document.getElementById('rangeSelect');
    const val = sel ? sel.value : 'all';
    let filterKey = `${currentMode}_${val}`;

    let baseList = [...allQuestions];

    if (currentMode === 'mistakes') {
      const mistakeIds = Object.keys(progress.mistakes).map(id => parseInt(id, 10));
      const starredIds = Object.keys(progress.starred).map(id => parseInt(id, 10));
      const wrongFromAnswered = Object.keys(progress.answered)
        .filter(id => !progress.answered[id].isCorrect)
        .map(id => parseInt(id, 10));

      const combinedIds = Array.from(new Set([...mistakeIds, ...starredIds, ...wrongFromAnswered]));
      baseList = allQuestions.filter(q => combinedIds.includes(q.id));
    } else if (val === 'multi_select') {
      baseList = allQuestions.filter(q => (q.correctAnswers && q.correctAnswers.length >= 2) || q.question.toLowerCase().includes('select two') || q.question.toLowerCase().includes('select 2'));
    } else if (val === 'custom') {
      let cStart = parseInt(document.getElementById('customStart').value, 10) || 1;
      let cEnd = parseInt(document.getElementById('customEnd').value, 10) || 496;

      cStart = Math.max(1, Math.min(cStart, allQuestions.length));
      cEnd = Math.max(cStart, Math.min(cEnd, allQuestions.length));

      document.getElementById('customStart').value = cStart;
      document.getElementById('customEnd').value = cEnd;

      filterKey = `${currentMode}_custom_${cStart}-${cEnd}`;
      baseList = allQuestions.filter(q => q.id >= cStart && q.id <= cEnd);
    } else if (val !== 'all') {
      const [start, end] = val.split('-').map(n => parseInt(n, 10));
      baseList = allQuestions.filter(q => q.id >= start && q.id <= end);
    }

    if (isShuffleOn) {
      if (forceReshuffle || shuffledCache.key !== filterKey || shuffledCache.list.length === 0) {
        const shuffled = shuffleArray(baseList).map(q => getQuestionWithOptionsShuffled(q));
        shuffledCache = {
          key: filterKey,
          list: shuffled
        };
      }
      activeQuestions = [...shuffledCache.list];
    } else {
      shuffledCache = { key: null, list: [] };
      activeQuestions = baseList;
    }

    if (resetIndex) {
      modeIndices[currentMode] = 0;
    }

    let savedIdx = modeIndices[currentMode] || 0;
    if (savedIdx >= activeQuestions.length) {
      savedIdx = Math.max(0, activeQuestions.length - 1);
    }
    currentIndex = savedIdx;

    renderCurrentMode();
  }

  // Update Top Stats Bar
  function updateGlobalStats() {
    const totalCount = allQuestions.length;
    const answeredKeys = Object.keys(progress.answered);
    const correctCount = answeredKeys.filter(id => progress.answered[id].isCorrect).length;

    const wrongFromAnswered = Object.keys(progress.answered).filter(id => !progress.answered[id].isCorrect).map(id => parseInt(id, 10));
    const mistakeIds = Object.keys(progress.mistakes).map(id => parseInt(id, 10));
    const wrongCount = Array.from(new Set([...wrongFromAnswered, ...mistakeIds])).length;
    const starCount = Object.keys(progress.starred).length;

    document.getElementById('statTotal').textContent = totalCount;
    document.getElementById('statCorrect').textContent = correctCount;
    document.getElementById('statWrong').textContent = wrongCount;
    document.getElementById('statStar').textContent = starCount;

    const percent = Math.round((correctCount / totalCount) * 100) || 0;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressText').textContent = `Đã thuộc ${correctCount}/${totalCount} câu (${percent}%)`;
  }

  // Switch App Mode
  function switchMode(mode) {
    if (currentMode in modeIndices) {
      modeIndices[currentMode] = currentIndex;
    }

    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });

    document.querySelectorAll('.view-section').forEach(s => {
      s.classList.remove('active');
    });

    document.getElementById(`view-${mode}`).classList.add('active');

    if (mode === 'exam') {
      initExamMode();
    } else if (mode === 'bank') {
      renderQuestionBank();
    } else {
      filterActiveQuestions(false, false);
    }

    saveProgress();
  }

  function renderCurrentMode() {
    if (currentMode === 'quick' || currentMode === 'mistakes') {
      renderQuickQuiz();
    } else if (currentMode === 'flashcard') {
      renderFlashcard();
    }
  }

  // 1. Render Quick Practice Quiz & Mistakes Quiz
  function renderQuickQuiz() {
    const targetContainer = (currentMode === 'mistakes')
      ? document.getElementById('mistakesContainer')
      : document.getElementById('quickQuizContainer');

    if (!targetContainer) return;

    if (activeQuestions.length === 0) {
      const emptyMsg = (currentMode === 'mistakes')
        ? '🎉 Tuyệt vời! Bạn hiện chưa có câu nào làm sai hoặc đánh dấu sao.'
        : 'Không tìm thấy câu hỏi nào! Hãy chọn lại dải câu hỏi.';

      targetContainer.innerHTML = `
        <div class="quiz-card" style="text-align: center; padding: 4rem 2rem; justify-content: center; align-items: center;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">🏆</div>
          <h2 style="font-size: 1.4rem; font-weight: 700; color: #fff;">${emptyMsg}</h2>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Hãy tiếp tục làm thêm các câu hỏi ở chế độ Luyện Siêu Tốc!</p>
        </div>
      `;
      return;
    }

    const q = activeQuestions[currentIndex];
    selectedOption = null;

    const isStarred = !!progress.starred[q.id];
    const prevAnswer = progress.answered[q.id];

    let optionsHtml = q.options.map(opt => `
      <div class="option-item" data-key="${opt.key}">
        <div class="option-key">${opt.key}</div>
        <div class="option-content">${opt.text}</div>
      </div>
    `).join('');

    const modeLabel = (currentMode === 'mistakes') ? 'CÂU SAI & KHÓ' : 'LUYỆN SIÊU TỐC';
    const shuffleBadge = isShuffleOn ? ' 🔀 Shuffled' : '';

    targetContainer.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-header">
          <div class="q-badge">${modeLabel} - Câu ${q.id} / ${allQuestions.length} (Vị trí ${currentIndex + 1}/${activeQuestions.length})${shuffleBadge}</div>
          <div class="q-actions">
            <span class="star-btn ${isStarred ? 'starred' : ''}" id="starBtn" title="Đánh dấu sao câu này">★</span>
          </div>
        </div>

        <div class="question-text">${q.question}</div>

        <div class="options-grid" id="optionsGrid">
          ${optionsHtml}
        </div>

        <div class="explanation-box" id="explanationBox">
          <div class="explanation-title" id="expTitle"></div>
          <div id="expBody">Đáp án chính xác: <strong style="color: var(--success); font-size: 1.1rem;">${q.correctAnswers.join(', ')}</strong></div>
        </div>

        <div class="quiz-footer">
          <button class="btn-action btn-secondary" id="prevBtn" ${currentIndex === 0 ? 'disabled' : ''}>
            ← Câu trước <span class="kbd-hint">←</span>
          </button>
          <button class="btn-action btn-secondary" id="retryBtn" style="display: none;" title="Xóa câu trả lời hiện tại và chọn lại">
            ↺ Làm lại
          </button>
          <button class="btn-action btn-primary" id="nextBtn">
            Câu tiếp → <span class="kbd-hint">Enter/→</span>
          </button>
        </div>
      </div>
    `;

    // Add Option Click Handler
    targetContainer.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        if (selectedOption !== null) return;
        const key = item.dataset.key;
        handleAnswerSelection(q, key, targetContainer);
      });
    });

    // Star Toggle
    const starBtn = targetContainer.querySelector('#starBtn');
    if (starBtn) {
      starBtn.addEventListener('click', () => {
        if (progress.starred[q.id]) {
          delete progress.starred[q.id];
        } else {
          progress.starred[q.id] = true;
        }
        saveProgress();
        starBtn.classList.toggle('starred', !!progress.starred[q.id]);
      });
    }

    // Retry Button Handler
    const retryBtn = targetContainer.querySelector('#retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        delete progress.answered[q.id];
        delete progress.mistakes[q.id];
        saveProgress();
        renderQuickQuiz();
      });
    }

    // Navigation Buttons
    const prevBtn = targetContainer.querySelector('#prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          modeIndices[currentMode] = currentIndex;
          saveProgress();
          renderQuickQuiz();
        }
      });
    }

    const nextBtn = targetContainer.querySelector('#nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < activeQuestions.length - 1) {
          currentIndex++;
          modeIndices[currentMode] = currentIndex;
          saveProgress();
          renderQuickQuiz();
        } else {
          alert('Chúc mừng! Bạn đã hoàn thành dải câu hỏi này!');
        }
      });
    }

    // In 'quick' mode, show previous answer state if present.
    // In 'mistakes' mode, present the question fresh so user can test themselves again!
    if (currentMode !== 'mistakes' && prevAnswer) {
      showAnswerState(q, prevAnswer.selectedKey, targetContainer);
    }
  }

  function handleAnswerSelection(q, selectedKey, container) {
    selectedOption = selectedKey;
    const isCorrect = q.correctAnswers.includes(selectedKey);

    progress.answered[q.id] = { selectedKey, isCorrect };

    if (!isCorrect) {
      progress.mistakes[q.id] = (progress.mistakes[q.id] || 0) + 1;
      playSound('wrong');
    } else {
      playSound('correct');
      delete progress.mistakes[q.id];
    }

    saveProgress();
    showAnswerState(q, selectedKey, container);
  }

  function showAnswerState(q, selectedKey, container) {
    selectedOption = selectedKey;

    container.querySelectorAll('.option-item').forEach(item => {
      item.classList.add('disabled');
      const key = item.dataset.key;

      if (q.correctAnswers.includes(key)) {
        item.classList.add('correct');
      }

      if (key === selectedKey && !q.correctAnswers.includes(key)) {
        item.classList.add('wrong');
      }
    });

    const expBox = container.querySelector('#explanationBox');
    const expTitle = container.querySelector('#expTitle');
    const retryBtn = container.querySelector('#retryBtn');

    if (retryBtn) {
      retryBtn.style.display = 'flex';
    }

    const isCorrect = q.correctAnswers.includes(selectedKey);

    if (expBox && expTitle) {
      expBox.classList.add('show');
      if (isCorrect) {
        expTitle.className = 'explanation-title success';
        expTitle.innerHTML = '✔ CHÍNH XÁC!';
      } else {
        expTitle.className = 'explanation-title error';
        expTitle.innerHTML = '✖ RẤT TIẾC, CHƯA ĐÚNG!';
      }
    }
  }

  // 2. Render Flashcard Mode
  function renderFlashcard() {
    const fcContainer = document.getElementById('flashcardContainer');
    if (!fcContainer) return;

    if (activeQuestions.length === 0) {
      fcContainer.innerHTML = `
        <div class="quiz-card" style="text-align: center; padding: 4rem 2rem; width: 100%;">
          <h2 style="color: #fff;">Không tìm thấy câu hỏi nào!</h2>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Hãy chọn lại dải câu hỏi hoặc chuyển chế độ.</p>
        </div>
      `;
      return;
    }

    const q = activeQuestions[currentIndex];

    const correctText = q.options
      .filter(o => q.correctAnswers.includes(o.key))
      .map(o => `<div style="margin-bottom: 0.4rem;"><strong>[${o.key}]</strong> ${o.text}</div>`)
      .join('');

    fcContainer.innerHTML = `
      <div class="flashcard-wrapper">
        <div class="flashcard" id="flashcardElement">
          <div class="card-face front">
            <div class="q-badge">Câu ${q.id} / ${allQuestions.length} (Thẻ ${currentIndex + 1}/${activeQuestions.length})${isShuffleOn ? ' 🔀' : ''}</div>
            <div class="question-text" style="font-size: 1.3rem; text-align: center; margin: auto;">${q.question}</div>
            <div class="card-hint">💡 Nhấn vào thẻ hoặc bấm [Space] để xem đáp án</div>
          </div>
          <div class="card-face back">
            <div class="q-badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">ĐÁP ÁN CHUẨN</div>
            <div style="font-size: 1.15rem; text-align: center; margin: auto; color: #fff; width: 100%;">
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--success); margin-bottom: 0.8rem;">Đáp án đúng: ${q.correctAnswers.join(', ')}</div>
              <div style="font-size: 1.05rem; text-align: left; background: rgba(255,255,255,0.05); padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                ${correctText}
              </div>
            </div>
            <div class="card-hint">💡 Nhấn vào thẻ để quay lại câu hỏi</div>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; width: 100%; justify-content: space-between;">
          <button class="btn-action btn-secondary" id="fcPrevBtn" ${currentIndex === 0 ? 'disabled' : ''}>← Thẻ trước <span class="kbd-hint">←</span></button>
          <button class="btn-action btn-primary" id="fcNextBtn">Thẻ tiếp → <span class="kbd-hint">Enter/→</span></button>
        </div>
      </div>
    `;

    const fc = document.getElementById('flashcardElement');
    if (fc) {
      fc.addEventListener('click', () => {
        fc.classList.toggle('flipped');
        playSound('flip');
      });
    }

    const fcPrev = document.getElementById('fcPrevBtn');
    if (fcPrev) {
      fcPrev.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          modeIndices.flashcard = currentIndex;
          renderFlashcard();
        }
      };
    }

    const fcNext = document.getElementById('fcNextBtn');
    if (fcNext) {
      fcNext.onclick = () => {
        if (currentIndex < activeQuestions.length - 1) {
          currentIndex++;
          modeIndices.flashcard = currentIndex;
          renderFlashcard();
        }
      };
    }
  }

  // 3. Render Question Bank & Live Search
  function renderQuestionBank() {
    const input = document.getElementById('searchInput');
    const container = document.getElementById('bankList');

    function filterAndShow() {
      const term = input.value.toLowerCase().trim();
      const filtered = allQuestions.filter(q => 
        q.id.toString().includes(term) ||
        q.question.toLowerCase().includes(term) ||
        q.options.some(o => o.text.toLowerCase().includes(term))
      );

      container.innerHTML = filtered.map(q => `
        <div class="bank-item">
          <div class="bank-q-title">Câu ${q.id}: ${q.question}</div>
          <div class="bank-opt-list">
            ${q.options.map(o => {
              const isCorrect = q.correctAnswers.includes(o.key);
              return `<div class="bank-opt ${isCorrect ? 'is-correct' : ''}">
                <strong>${o.key}.</strong> ${o.text} ${isCorrect ? ' ✔' : ''}
              </div>`;
            }).join('')}
          </div>
        </div>
      `).join('');
    }

    input.oninput = filterAndShow;
    filterAndShow();
  }

  // 4. Exam Simulator Mode
  function initExamMode() {
    const examQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 40).map(q => getQuestionWithOptionsShuffled(q));
    examState = {
      questions: examQuestions,
      userAnswers: {},
      timerSeconds: 40 * 60,
      intervalId: null,
      isSubmitted: false
    };

    renderExamScreen();
    startExamTimer();
  }

  function startExamTimer() {
    if (examState.intervalId) clearInterval(examState.intervalId);

    examState.intervalId = setInterval(() => {
      examState.timerSeconds--;
      updateTimerDisplay();

      if (examState.timerSeconds <= 0) {
        clearInterval(examState.intervalId);
        submitExam();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(examState.timerSeconds / 60);
    const s = examState.timerSeconds % 60;
    const str = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const el = document.getElementById('examTimer');
    if (el) el.textContent = str;
  }

  function renderExamScreen() {
    const container = document.getElementById('examQuestionsContainer');
    if (!container) return;

    container.innerHTML = examState.questions.map((q, idx) => `
      <div class="quiz-card" style="margin-bottom: 1.5rem;" id="exam-q-${q.id}">
        <div class="quiz-header">
          <div class="q-badge">Câu ${idx + 1} / 40 (Gốc: Câu ${q.id})</div>
        </div>
        <div class="question-text">${q.question}</div>
        <div class="options-grid">
          ${q.options.map(opt => `
            <div class="option-item exam-opt-${q.id}" data-qid="${q.id}" data-key="${opt.key}">
              <div class="option-key">${opt.key}</div>
              <div class="option-content">${opt.text}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        if (examState.isSubmitted) return;
        const qid = parseInt(item.dataset.qid, 10);
        const key = item.dataset.key;

        examState.userAnswers[qid] = key;

        container.querySelectorAll(`.exam-opt-${qid}`).forEach(el => {
          el.classList.remove('correct', 'wrong');
          if (el.dataset.key === key) {
            el.classList.add('correct');
          }
        });
      });
    });
  }

  function submitExam() {
    if (examState.isSubmitted) return;
    examState.isSubmitted = true;
    if (examState.intervalId) clearInterval(examState.intervalId);

    let score = 0;
    examState.questions.forEach(q => {
      const userAns = examState.userAnswers[q.id];
      if (userAns && q.correctAnswers.includes(userAns)) {
        score++;
      }
    });

    const mark = ((score / 40) * 10).toFixed(1);

    document.getElementById('examQuestionsContainer').innerHTML = `
      <div class="exam-summary">
        <h2>KẾT QUẢ THI THỬ MLN122</h2>
        <div class="exam-score">${mark} / 10</div>
        <p style="font-size: 1.2rem; color: var(--text-muted);">Bạn trả lời đúng <strong>${score} / 40</strong> câu hỏi.</p>
        <button class="btn-action btn-primary" id="restartExamBtn" style="margin: 1.5rem auto 0;">Thi lại đề mới 🔄</button>
      </div>
    `;

    document.getElementById('restartExamBtn').onclick = () => {
      initExamMode();
    };
  }

  document.getElementById('submitExamBtn').onclick = () => {
    if (confirm('Bạn có chắc chắn muốn nộp bài thi thử không?')) {
      submitExam();
    }
  };

  // Keyboard Shortcuts Listener
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key.toUpperCase();

    if (currentMode === 'quick' || currentMode === 'mistakes') {
      if (['A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5'].includes(key)) {
        let optKey = key;
        if (key === '1') optKey = 'A';
        if (key === '2') optKey = 'B';
        if (key === '3') optKey = 'C';
        if (key === '4') optKey = 'D';
        if (key === '5') optKey = 'E';

        const q = activeQuestions[currentIndex];
        if (q && selectedOption === null) {
          const container = (currentMode === 'mistakes')
            ? document.getElementById('mistakesContainer')
            : document.getElementById('quickQuizContainer');
          if (container) {
            const optEl = container.querySelector(`.option-item[data-key="${optKey}"]`);
            if (optEl) optEl.click();
          }
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        const container = (currentMode === 'mistakes')
          ? document.getElementById('mistakesContainer')
          : document.getElementById('quickQuizContainer');
        if (container) {
          const nextBtn = container.querySelector('#nextBtn');
          if (nextBtn) nextBtn.click();
        }
      } else if (e.key === 'ArrowLeft') {
        const container = (currentMode === 'mistakes')
          ? document.getElementById('mistakesContainer')
          : document.getElementById('quickQuizContainer');
        if (container) {
          const prevBtn = container.querySelector('#prevBtn');
          if (prevBtn) prevBtn.click();
        }
      } else if (key === 'S') {
        const container = (currentMode === 'mistakes')
          ? document.getElementById('mistakesContainer')
          : document.getElementById('quickQuizContainer');
        if (container) {
          const starBtn = container.querySelector('#starBtn');
          if (starBtn) starBtn.click();
        }
      }
    } else if (currentMode === 'flashcard') {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const fc = document.getElementById('flashcardElement');
        if (fc) fc.click();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        const fcNext = document.getElementById('fcNextBtn');
        if (fcNext) fcNext.click();
      } else if (e.key === 'ArrowLeft') {
        const fcPrev = document.getElementById('fcPrevBtn');
        if (fcPrev) fcPrev.click();
      }
    }
  });

  // Shuffle Toggle Listener
  document.getElementById('shuffleToggle').onclick = () => {
    isShuffleOn = !isShuffleOn;
    updateShuffleUI();
    filterActiveQuestions(true, true);
    saveProgress();
  };

  // Sound Toggle Listener
  document.getElementById('soundToggle').onclick = () => {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggle').textContent = soundEnabled ? '🔊' : '🔇';
  };

  // Mode Tabs Click Listeners
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchMode(tab.dataset.mode);
    });
  });

  // Reset Progress Button
  document.getElementById('resetBtn').onclick = () => {
    if (confirm('Bạn có chắc chắn muốn reset toàn bộ tiến độ học thuộc không?')) {
      progress = { answered: {}, starred: {}, mistakes: {}, lastQuickIndex: 0, isShuffleOn: false };
      modeIndices = { quick: 0, flashcard: 0, mistakes: 0 };
      isShuffleOn = false;
      shuffledCache = { key: null, list: [] };
      updateShuffleUI();
      saveProgress();
      filterActiveQuestions(true, true);
      alert('Đã reset tiến độ thành công!');
    }
  };

  // Modal & Import Handling Logic
  function setupImportModal() {
    const modal = document.getElementById('importModal');
    const modalBtn = document.getElementById('importModalBtn');
    const closeBtn = document.getElementById('closeImportModalBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');
    const confirmBtn = document.getElementById('confirmImportBtn');
    const textarea = document.getElementById('importTextarea');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const dropText = document.getElementById('dropZoneText');
    const presetMln = document.getElementById('presetMln122');
    const presetIte = document.getElementById('presetIte302c');

    if (!modal) return;

    let pendingContent = null;
    let selectedPresetKey = currentSubjectKey;

    function openModal() {
      pendingContent = null;
      selectedPresetKey = currentSubjectKey;

      if (presetMln) presetMln.classList.toggle('active', currentSubjectKey === 'mln122');
      if (presetIte) presetIte.classList.toggle('active', currentSubjectKey === 'ite302c');

      if (textarea) textarea.value = '';
      if (dropText) dropText.innerHTML = 'Kéo thả file <b>.md / .txt / .json</b> vào đây hoặc <span style="color: var(--primary); text-decoration: underline; cursor: pointer;">click để chọn file</span>';
      modal.style.display = 'flex';
    }

    function closeModal() {
      modal.style.display = 'none';
    }

    if (modalBtn) modalBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Preset Selection
    [presetMln, presetIte].forEach(btn => {
      if (btn) {
        btn.onclick = () => {
          [presetMln, presetIte].forEach(b => b && b.classList.remove('active'));
          btn.classList.add('active');
          selectedPresetKey = btn.dataset.preset;
          pendingContent = null;
          if (textarea) textarea.value = '';
        };
      }
    });

    // File Drag & Drop + File Selector
    if (dropZone && fileInput) {
      dropZone.onclick = () => fileInput.click();

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      };
    }

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        pendingContent = evt.target.result;
        selectedPresetKey = 'custom';
        [presetMln, presetIte].forEach(b => b && b.classList.remove('active'));
        if (dropText) dropText.innerHTML = `✅ Đã chọn file: <b>${file.name}</b> (${(file.size / 1024).toFixed(1)} KB)`;
      };
      reader.readAsText(file, 'utf-8');
    }

    // Confirm Import
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const pastedText = textarea ? textarea.value.trim() : '';
        if (pastedText) {
          pendingContent = pastedText;
          selectedPresetKey = 'custom';
        }

        if (selectedPresetKey === 'custom' && pendingContent) {
          await loadSubjectData('custom', pendingContent, "Bộ Đề Import Tùy Chỉnh");
        } else {
          await loadSubjectData(selectedPresetKey);
        }

        closeModal();
      };
    }
  }

  // Run modal setup
  setupImportModal();

  // Run initialization
  initData();
});
