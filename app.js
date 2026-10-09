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
    hcm202_fe: {
      key: 'hcm202_fe',
      title: 'HCM202 - Tư Tưởng Hồ Chí Minh',
      subtitle: 'Đề Thi Final Exam SP2025 (415 câu chính xác 100% chuẩn Giáo trình 2021)',
      file: 'HCM202_dataset.json'
    },
    hcm202: {
      key: 'hcm202',
      title: 'HCM202 - Tư Tưởng Hồ Chí Minh',
      subtitle: '100 câu trắc nghiệm Assignment & SEB (Chuẩn Bộ GD&ĐT 2021)',
      file: 'hcm202_data.md'
    },
    mln122: {
      key: 'mln122',
      title: 'MLN122 - Kinh Tế Chính Trị Mác - Lênin',
      subtitle: '496 câu trắc nghiệm học thuộc lòng siêu tốc',
      file: 'data.md'
    },
    ite302c: {
      key: 'ite302c',
      title: 'ITE302c - Ethics in AI & Data Science',
      subtitle: '394 câu trắc nghiệm đạo đức AI (Chuẩn Nhung Hoàng)',
      file: 'ite302c_data.md'
    }
  };

  let currentSubjectKey = localStorage.getItem('CURRENT_SUBJECT_KEY') || 'hcm202_fe';

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
      let title = "HCM202 - Tư Tưởng Hồ Chí Minh";
      let subtitle = "Đề Thi Final Exam SP2025 (415 câu chuẩn 100%)";

      if (SUBJECT_PRESETS[key]) {
        title = SUBJECT_PRESETS[key].title;
        subtitle = SUBJECT_PRESETS[key].subtitle;

        // Optimized instant loading if preloaded in window (handles file:// without CORS issues)
        if (key === 'hcm202_fe' && window.PRESET_DATA_HCM202_FE && Array.isArray(window.PRESET_DATA_HCM202_FE)) {
          allQuestions = window.PRESET_DATA_HCM202_FE;
          textToParse = null;
        } else {
          try {
            const resp = await fetch(SUBJECT_PRESETS[key].file + '?v=' + Date.now());
            if (!resp.ok) throw new Error(`Could not load ${SUBJECT_PRESETS[key].file}`);
            textToParse = await resp.text();
          } catch (fetchErr) {
            if (key === 'hcm202_fe' && window.PRESET_DATA_HCM202_FE && Array.isArray(window.PRESET_DATA_HCM202_FE)) {
              allQuestions = window.PRESET_DATA_HCM202_FE;
              textToParse = null;
            } else {
              throw fetchErr;
            }
          }
        }
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

      if (textToParse) {
        const parsed = parseInputToQuestions(textToParse);
        if (!parsed || parsed.length === 0) {
          throw new Error("Không tìm thấy câu hỏi hợp lệ trong dữ liệu!");
        }
        allQuestions = parsed;
      }

      if (!allQuestions || allQuestions.length === 0) {
        throw new Error("Chưa có dữ liệu bộ đề để nạp. Hãy chọn hoặc import file mới!");
      }

      // Update Header Titles & Subject Badge
      const titleEl = document.getElementById('mainBrandTitle') || document.querySelector('.brand-title');
      const subEl = document.getElementById('subjectSubtitle') || document.querySelector('.brand-subtitle');
      const badgeEl = document.getElementById('activeSubjectBadge');
      const examTitleEl = document.getElementById('examSubjectTitle');

      if (badgeEl) badgeEl.textContent = key === 'hcm202_fe' ? 'HCM202 FE' : key.toUpperCase();
      if (titleEl) titleEl.textContent = title;
      if (subEl) subEl.textContent = `${subtitle} (${allQuestions.length} câu)`;
      if (examTitleEl) examTitleEl.textContent = `Đề Thi Thử ${title} (40 Câu - 40 Phút)`;
      document.title = `${title} - Ôn Thi Siêu Tốc`;

      // Update quick subject pills in header
      document.querySelectorAll('.sub-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.subject === key);
      });

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
    const multiSelectBtn = document.getElementById('multiSelectBtn');
    if (multiSelectCount > 0) {
      const multiOpt = document.createElement('option');
      multiOpt.value = 'multi_select';
      multiOpt.textContent = `✌️ Câu hỏi chọn 2 đáp án (${multiSelectCount} câu)`;
      sel.appendChild(multiOpt);
      if (multiSelectBtn) {
        multiSelectBtn.style.display = 'inline-flex';
        multiSelectBtn.innerHTML = `✌️ Ôn ${multiSelectCount} câu chọn 2 đáp án`;
      }
    } else {
      if (multiSelectBtn) {
        multiSelectBtn.style.display = 'none';
      }
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
          <div id="expBody">
            <div>Đáp án chính xác: <strong style="color: var(--success); font-size: 1.1rem;">${q.correctAnswers.join(', ')}</strong></div>
            ${q.explanation ? `<div class="exp-detail" style="margin-top: 0.6rem; font-size: 0.95rem; color: #cbd5e1; line-height: 1.6; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 0.5rem; text-align: left;">💡 <b>Căn cứ giáo trình:</b> ${q.explanation}</div>` : ''}
          </div>
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
                ${q.explanation ? `<div style="margin-top: 0.8rem; padding-top: 0.6rem; border-top: 1px dashed rgba(255,255,255,0.15); font-size: 0.95rem; color: #cbd5e1; line-height: 1.5;">💡 <b>Căn cứ giáo trình:</b> ${q.explanation}</div>` : ''}
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
          ${q.explanation ? `<div style="margin-top: 0.65rem; font-size: 0.88rem; color: #cbd5e1; background: rgba(16, 185, 129, 0.08); padding: 0.5rem 0.85rem; border-radius: 8px; border-left: 3px solid var(--success); text-align: left;">💡 <b>Căn cứ giáo trình:</b> ${q.explanation}</div>` : ''}
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

  // Toast Notification Helper
  function showToast(message, icon = '✅', duration = 3500) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    const toastIco = document.getElementById('toastIcon');
    if (!toast) return;
    if (toastMsg) toastMsg.textContent = message;
    if (toastIco) toastIco.textContent = icon;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  // Modal & Import Handling Logic (Multi-Tab + Unlimited OCR)
  function setupImportModal() {
    const modal = document.getElementById('importModal');
    const modalBtn = document.getElementById('importModalBtn');
    const ocrTriggerBtn = document.getElementById('ocrModalBtn');
    const closeBtn = document.getElementById('closeImportModalBtn');
    const cancelBtn = document.getElementById('cancelImportBtn');
    const confirmBtn = document.getElementById('confirmImportBtn');

    // Modal Tabs
    const navTabs = document.querySelectorAll('.modal-nav-tab');
    const tabContents = document.querySelectorAll('.modal-tab-content');

    // OCR Elements
    const ocrDropZone = document.getElementById('ocrDropZone');
    const ocrFileInput = document.getElementById('ocrFileInput');
    const ocrDropText = document.getElementById('ocrDropText');
    const ocrFilesCard = document.getElementById('ocrFilesCard');
    const ocrFilesCount = document.getElementById('ocrFilesCount');
    const ocrFilesDetail = document.getElementById('ocrFilesDetail');
    const ocrSplitCheck = document.getElementById('ocrSplitCheck');
    const ocrLangSelect = document.getElementById('ocrLangSelect');
    const ocrEngineSelect = document.getElementById('ocrEngineSelect');
    const ocrAutoSolveCheck = document.getElementById('ocrAutoSolveCheck');
    const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
    const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
    const geminiKeyBox = document.getElementById('geminiKeyBox');
    const startOcrBtn = document.getElementById('startOcrBtn');
    const clearOcrFilesBtn = document.getElementById('clearOcrFilesBtn');

    // Restore saved API Key
    if (geminiApiKeyInput) {
      const savedKey = localStorage.getItem('GEMINI_API_KEY');
      if (savedKey) geminiApiKeyInput.value = savedKey;
      geminiApiKeyInput.addEventListener('change', () => {
        localStorage.setItem('GEMINI_API_KEY', geminiApiKeyInput.value.trim());
      });
    }

    if (toggleKeyVisibility && geminiApiKeyInput) {
      toggleKeyVisibility.onclick = () => {
        if (geminiApiKeyInput.type === 'password') {
          geminiApiKeyInput.type = 'text';
          toggleKeyVisibility.textContent = '🔒 Ẩn';
        } else {
          geminiApiKeyInput.type = 'password';
          toggleKeyVisibility.textContent = '👁️ Hiện';
        }
      };
    }

    if (ocrEngineSelect) {
      ocrEngineSelect.onchange = () => {
        const isGemini = ocrEngineSelect.value === 'gemini';
        if (geminiKeyBox) geminiKeyBox.style.display = isGemini ? 'flex' : 'none';
        const solveLbl = document.getElementById('ocrAutoSolveLabel');
        if (solveLbl) solveLbl.style.display = isGemini ? 'flex' : 'none';
      };
    }

    // OCR Progress
    const ocrProgressCard = document.getElementById('ocrProgressCard');
    const ocrProgressTitle = document.getElementById('ocrProgressTitle');
    const ocrProgressPercent = document.getElementById('ocrProgressPercent');
    const ocrProgressBar = document.getElementById('ocrProgressBar');
    const ocrCurrentFile = document.getElementById('ocrCurrentFile');
    const cancelOcrBtn = document.getElementById('cancelOcrBtn');

    // OCR Result
    const ocrResultCard = document.getElementById('ocrResultCard');
    const ocrResultBadge = document.getElementById('ocrResultBadge');
    const ocrJsonPreview = document.getElementById('ocrJsonPreview');
    const copyAiPromptBtn = document.getElementById('copyAiPromptBtn');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    const loadDirectToAppBtn = document.getElementById('loadDirectToAppBtn');
    const ocrAiResultInput = document.getElementById('ocrAiResultInput');
    const applyAiJsonBtn = document.getElementById('applyAiJsonBtn');

    // Presets & File Elements
    const textarea = document.getElementById('importTextarea');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const dropText = document.getElementById('dropZoneText');
    const presetHcmFe = document.getElementById('presetHcm202Fe');
    const presetHcm = document.getElementById('presetHcm202');
    const presetMln = document.getElementById('presetMln122');
    const presetIte = document.getElementById('presetIte302c');

    if (!modal) return;

    let pendingContent = null;
    let selectedPresetKey = currentSubjectKey;
    let selectedOcrFiles = [];
    let lastExtractedQuestions = [];

    // Switch Modal Tabs
    function switchModalTab(tabId) {
      navTabs.forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
      });
      tabContents.forEach(c => {
        if (c.id === tabId) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    }

    navTabs.forEach(tab => {
      tab.onclick = () => switchModalTab(tab.dataset.tab);
    });

    function openModal(defaultTab = 'tab-presets-content') {
      pendingContent = null;
      selectedPresetKey = currentSubjectKey;

      if (presetHcmFe) presetHcmFe.classList.toggle('active', currentSubjectKey === 'hcm202_fe');
      if (presetHcm) presetHcm.classList.toggle('active', currentSubjectKey === 'hcm202');
      if (presetMln) presetMln.classList.toggle('active', currentSubjectKey === 'mln122');
      if (presetIte) presetIte.classList.toggle('active', currentSubjectKey === 'ite302c');

      if (textarea) textarea.value = '';
      if (dropText) dropText.innerHTML = 'Kéo thả file <b>.md / .txt / .json</b> vào đây hoặc <span style="color: var(--primary); text-decoration: underline; cursor: pointer;">click để chọn file</span>';

      switchModalTab(defaultTab);
      modal.style.display = 'flex';
    }

    function closeModal() {
      modal.style.display = 'none';
    }

    if (modalBtn) modalBtn.onclick = () => openModal('tab-presets-content');
    if (ocrTriggerBtn) ocrTriggerBtn.onclick = () => openModal('tab-ocr-content');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Preset Selection
    const presetButtons = [presetHcmFe, presetHcm, presetMln, presetIte];
    presetButtons.forEach(btn => {
      if (btn) {
        btn.onclick = () => {
          presetButtons.forEach(b => b && b.classList.remove('active'));
          btn.classList.add('active');
          selectedPresetKey = btn.dataset.preset;
          pendingContent = null;
          if (textarea) textarea.value = '';
        };
      }
    });

    // File Drag & Drop + File Selector (Text/JSON/MD)
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
        presetButtons.forEach(b => b && b.classList.remove('active'));
        if (dropText) dropText.innerHTML = `✅ Đã chọn file: <b>${file.name}</b> (${(file.size / 1024).toFixed(1)} KB)`;
      };
      reader.readAsText(file, 'utf-8');
    }

    // ==========================================
    // OCR Image Processing (Unlimited Files)
    // ==========================================
    if (ocrDropZone && ocrFileInput) {
      ocrDropZone.onclick = () => ocrFileInput.click();

      ocrDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        ocrDropZone.classList.add('drag-over');
      });

      ocrDropZone.addEventListener('dragleave', () => {
        ocrDropZone.classList.remove('drag-over');
      });

      ocrDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        ocrDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleOcrFiles(e.dataTransfer.files);
        }
      });

      ocrFileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleOcrFiles(e.target.files);
        }
      };
    }

    function handleOcrFiles(fileList) {
      const files = Array.from(fileList).filter(f => {
        const type = f.type || '';
        const name = f.name.toLowerCase();
        return type.startsWith('image/') || name.endsWith('.webp') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
      });

      if (files.length === 0) {
        alert("Vui lòng chọn các file ảnh (.webp, .png, .jpg)!");
        return;
      }

      selectedOcrFiles = files;
      if (ocrFilesCard) ocrFilesCard.style.display = 'flex';
      if (ocrFilesCount) ocrFilesCount.textContent = `Đã chọn ${files.length} file ảnh đề thi`;
      
      const first = files[0].name;
      const last = files[files.length - 1].name;
      const detailStr = files.length > 1 ? `Từ "${first}" ... đến "${last}"` : `Tệp: ${first}`;
      if (ocrFilesDetail) ocrFilesDetail.textContent = detailStr;

      if (ocrDropText) {
        ocrDropText.innerHTML = `✅ Đã chọn <b>${files.length} ảnh</b>. Sẵn sàng trích xuất OCR!`;
      }
    }

    if (clearOcrFilesBtn) {
      clearOcrFilesBtn.onclick = () => {
        selectedOcrFiles = [];
        if (ocrFilesCard) ocrFilesCard.style.display = 'none';
        if (ocrProgressCard) ocrProgressCard.style.display = 'none';
        if (ocrResultCard) ocrResultCard.style.display = 'none';
        if (ocrFileInput) ocrFileInput.value = '';
        if (ocrDropText) {
          ocrDropText.innerHTML = 'Kéo thả thư mục ảnh hoặc <b>click để chọn nhiều ảnh</b> (.webp, .png, .jpg)<br><small style="color: var(--accent-cyan);">Hỗ trợ chọn không giới hạn số lượng ảnh • Tự động xếp theo số thứ tự câu</small>';
        }
      };
    }

    // Start Batch OCR
    if (startOcrBtn) {
      startOcrBtn.onclick = async () => {
        if (!selectedOcrFiles || selectedOcrFiles.length === 0) {
          alert("Chưa có ảnh nào được chọn!");
          return;
        }

        if (!window.OcrEngine) {
          alert("Engine OCR chưa sẵn sàng. Hãy kiểm tra kết nối mạng để tải thư viện!");
          return;
        }

        if (ocrFilesCard) ocrFilesCard.style.display = 'none';
        if (ocrResultCard) ocrResultCard.style.display = 'none';
        if (ocrProgressCard) ocrProgressCard.style.display = 'flex';

        const engine = ocrEngineSelect ? ocrEngineSelect.value : 'gemini';
        let result = null;

        try {
          if (engine === 'gemini') {
            const apiKey = geminiApiKeyInput ? geminiApiKeyInput.value.trim() : '';
            if (!apiKey) {
              alert("Vui lòng nhập Gemini API Key để quét!");
              if (ocrProgressCard) ocrProgressCard.style.display = 'none';
              if (ocrFilesCard) ocrFilesCard.style.display = 'flex';
              return;
            }
            localStorage.setItem('GEMINI_API_KEY', apiKey);
            const autoSolve = ocrAutoSolveCheck ? ocrAutoSolveCheck.checked : true;

            result = await window.OcrEngine.processWithGeminiVision(
              selectedOcrFiles,
              { apiKey, autoSolve, batchSize: 4 },
              (p) => {
                if (ocrProgressTitle) ocrProgressTitle.textContent = `Đang quét bằng Gemini AI (${p.current}/${p.total})...`;
                if (ocrProgressPercent) ocrProgressPercent.textContent = `${p.percent}%`;
                if (ocrProgressBar) ocrProgressBar.style.width = `${p.percent}%`;
                if (ocrCurrentFile) ocrCurrentFile.textContent = p.status || p.currentFileName;
              },
              (logMsg) => {
                console.log("[Gemini AI Log]:", logMsg);
              }
            );
          } else {
            const splitLayout = ocrSplitCheck ? ocrSplitCheck.checked : true;
            const lang = ocrLangSelect ? ocrLangSelect.value : 'vie+eng';

            result = await window.OcrEngine.batchProcessImages(
              selectedOcrFiles,
              { splitLayout, lang },
              (p) => {
                if (ocrProgressTitle) ocrProgressTitle.textContent = `Đang quét OCR (${p.current}/${p.total})...`;
                if (ocrProgressPercent) ocrProgressPercent.textContent = `${p.percent}%`;
                if (ocrProgressBar) ocrProgressBar.style.width = `${p.percent}%`;
                if (ocrCurrentFile) ocrCurrentFile.textContent = `${p.currentFileName}`;
              },
              (logMsg) => {
                console.log("[Tesseract OCR Log]:", logMsg);
              }
            );
          }

          if (ocrProgressCard) ocrProgressCard.style.display = 'none';

          if (result && result.questions && result.questions.length > 0) {
            lastExtractedQuestions = result.questions;
            if (ocrResultCard) ocrResultCard.style.display = 'flex';
            if (ocrResultBadge) {
              ocrResultBadge.textContent = `✅ Đã trích xuất thành công ${result.questions.length} / ${result.totalInput} câu hỏi vào JSON`;
            }
            if (ocrJsonPreview) {
              ocrJsonPreview.value = JSON.stringify(result.questions, null, 2);
            }
            showToast(`Trích xuất hoàn tất ${result.questions.length} câu hỏi!`, "🎉");
          } else {
            alert("Không tìm thấy nội dung câu hỏi nào trong các ảnh đã chọn.");
            if (ocrFilesCard) ocrFilesCard.style.display = 'flex';
          }
        } catch (err) {
          console.error("OCR batch error:", err);
          alert("Lỗi OCR: " + err.message);
          if (ocrProgressCard) ocrProgressCard.style.display = 'none';
          if (ocrFilesCard) ocrFilesCard.style.display = 'flex';
        }
      };
    }

    // Cancel OCR
    if (cancelOcrBtn) {
      cancelOcrBtn.onclick = () => {
        if (window.OcrEngine) {
          window.OcrEngine.cancelBatch();
        }
      };
    }

    // Copy AI Prompt
    if (copyAiPromptBtn) {
      copyAiPromptBtn.onclick = async () => {
        if (!lastExtractedQuestions || lastExtractedQuestions.length === 0) {
          alert("Chưa có câu hỏi nào để copy!");
          return;
        }

        const promptText = window.OcrEngine.generateAiPrompt(lastExtractedQuestions, "Tư tưởng Hồ Chí Minh (HCM202)");
        try {
          await navigator.clipboard.writeText(promptText);
          showToast("Đã copy Prompt + JSON vào Clipboard! Hãy dán vào AI để giải đáp án.", "📋", 4500);
        } catch (e) {
          if (ocrJsonPreview) {
            ocrJsonPreview.value = promptText;
            ocrJsonPreview.select();
            document.execCommand('copy');
            showToast("Đã copy Prompt + JSON!", "📋");
          }
        }
      };
    }

    // Download JSON
    if (downloadJsonBtn) {
      downloadJsonBtn.onclick = () => {
        if (!lastExtractedQuestions || lastExtractedQuestions.length === 0) {
          alert("Chưa có dữ liệu để tải về!");
          return;
        }

        const jsonStr = JSON.stringify(lastExtractedQuestions, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `questions_extracted_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Đã tải file questions_extracted.json về máy!", "💾");
      };
    }

    // Load direct to app with temporary answer
    if (loadDirectToAppBtn) {
      loadDirectToAppBtn.onclick = async () => {
        if (!lastExtractedQuestions || lastExtractedQuestions.length === 0) return;
        
        // Add temporary correctAnswers if missing so user can view/learn
        const readyQuestions = lastExtractedQuestions.map(q => ({
          ...q,
          correctAnswers: (q.correctAnswers && q.correctAnswers.length > 0) ? q.correctAnswers : ["A"]
        }));

        await loadSubjectData('custom', JSON.stringify(readyQuestions), "Đề Thi OCR (Chưa Có Đáp Án AI)");
        closeModal();
        showToast(`Đã nạp ${readyQuestions.length} câu hỏi vào app để xem trước!`, "⚡");
      };
    }

    // Apply AI Result JSON
    if (applyAiJsonBtn && ocrAiResultInput) {
      applyAiJsonBtn.onclick = async () => {
        let text = ocrAiResultInput.value.trim();
        if (!text) {
          alert("Vui lòng dán mã JSON mà AI đã trả lời vào ô!");
          return;
        }

        // Clean markdown code blocks if present
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

        try {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("Dữ liệu JSON phải là một mảng câu hỏi!");
          }

          // Ensure options and correctAnswers exist
          parsed.forEach((q, idx) => {
            if (!q.correctAnswers || !Array.isArray(q.correctAnswers)) {
              q.correctAnswers = ["A"];
            }
          });

          await loadSubjectData('custom', JSON.stringify(parsed), "Bộ Đề OCR (Đã Có Đáp Án AI)");
          closeModal();
          showToast(`Đã nạp thành công ${parsed.length} câu hỏi có đáp án từ AI!`, "🚀", 4000);
        } catch (e) {
          alert("Lỗi định dạng JSON: " + e.message + "\nHãy kiểm tra lại đoạn JSON copy từ AI.");
        }
      };
    }

    // Confirm Import from Text / Presets
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const pastedText = textarea ? textarea.value.trim() : '';
        if (pastedText) {
          pendingContent = pastedText;
          selectedPresetKey = 'custom';
        }

        if (selectedPresetKey === 'custom' && pendingContent) {
          await loadSubjectData('custom', pendingContent, "Bộ Đề Import Tùy Chỉnh");
          showToast("Đã nạp bộ đề tùy chỉnh thành công!", "📁");
        } else {
          await loadSubjectData(selectedPresetKey);
          showToast("Đã đổi sang môn học thành công!", "📚");
        }

        closeModal();
      };
    }
  }

  // Quick Header Subject Switcher Pills
  document.querySelectorAll('.sub-pill').forEach(pill => {
    pill.addEventListener('click', async () => {
      const subKey = pill.dataset.subject;
      if (subKey && subKey !== currentSubjectKey) {
        await loadSubjectData(subKey);
        const title = SUBJECT_PRESETS[subKey]?.title || subKey;
        showToast(`Đã chuyển sang: ${title}`, '⚡');
      }
    });
  });

  // Run modal setup
  setupImportModal();

  // Run initialization
  initData();
});

