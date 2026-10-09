/**
 * OCR Engine for Web App - High Precision Edition (V3)
 * Specifically optimized for Vietnamese Quiz Screenshots (FUOverflow / Kizspy / Standard Quizzes)
 * Powered by Tesseract.js (Client-side Web Worker)
 */

window.OcrEngine = (() => {
  let workerInstance = null;
  let isWorkerInitializing = false;
  let isCancelled = false;

  /**
   * Initialize or retrieve shared Tesseract.js worker
   */
  async function getWorker(lang = 'vie+eng', onLog = null) {
    if (workerInstance) return workerInstance;

    if (typeof Tesseract === 'undefined') {
      throw new Error("Thư viện Tesseract.js chưa được tải. Vui lòng kiểm tra kết nối mạng!");
    }

    if (isWorkerInitializing) {
      while (isWorkerInitializing) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (workerInstance) return workerInstance;
    }

    isWorkerInitializing = true;
    try {
      if (onLog) onLog("Đang khởi tạo Tesseract OCR worker (tải dữ liệu ngôn ngữ tiếng Việt + Anh)...");
      workerInstance = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (onLog && m && m.status) {
            const pct = m.progress ? ` (${Math.round(m.progress * 100)}%)` : '';
            if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract' || m.status === 'loading language traineddata') {
              onLog(`${m.status}${pct}`);
            }
          }
        }
      });
      return workerInstance;
    } finally {
      isWorkerInitializing = false;
    }
  }

  /**
   * Extract exam and question info from filename
   * e.g. "HCM202_SP2025_FE_36 (10).webp" -> { exam: 36, qNum: 10, sortKey: 36010 }
   */
  function extractFileInfo(fileName) {
    if (!fileName) return { exam: 0, qNum: 0, sortKey: 999999 };

    let exam = 0;
    let qNum = 0;

    const feMatch = fileName.match(/(?:FE_|de_|đề_|-)(\d+)/i);
    if (feMatch) {
      exam = parseInt(feMatch[1], 10);
    }

    const qMatch = fileName.match(/\((\d+)\)/);
    if (qMatch) {
      qNum = parseInt(qMatch[1], 10);
    } else {
      const altMatch = fileName.match(/(?:cau_|câu_|q_?|question_?)(\d+)/i);
      if (altMatch) {
        qNum = parseInt(altMatch[1], 10);
      }
    }

    const sortKey = (exam * 1000) + (qNum || 0);
    return { exam, qNum, sortKey };
  }

  function extractIdFromFilename(fileName) {
    const info = extractFileInfo(fileName);
    if (info.exam > 0 && info.qNum > 0) {
      return (info.exam * 100) + info.qNum;
    }
    if (info.qNum > 0) return info.qNum;
    if (info.exam > 0) return info.exam;
    return null;
  }

  /**
   * Find vertical red divider line (FUOverflow / Kizspy interface)
   */
  function findVerticalRedDivider(ctx, width, height) {
    const minX = Math.floor(width * 0.20);
    const maxX = Math.floor(width * 0.65);
    const sampleYStep = 8;
    const sampleRows = Math.floor(height / sampleYStep);

    let bestX = -1;
    let maxRedScore = 0;

    const imgData = ctx.getImageData(minX, 0, maxX - minX, height);
    const data = imgData.data;

    for (let col = 0; col < maxX - minX; col++) {
      let redCount = 0;
      for (let y = 0; y < height; y += sampleYStep) {
        const idx = (y * (maxX - minX) + col) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Red line: High red, Low green & blue
        if (r > 130 && g < 95 && b < 95 && (r - g) > 40 && (r - b) > 40) {
          redCount++;
        }
      }
      if (redCount > maxRedScore && redCount > sampleRows * 0.20) {
        maxRedScore = redCount;
        bestX = minX + col;
      }
    }

    return bestX;
  }

  /**
   * Preprocess canvas with adaptive binarization
   * Removes light grey watermarks (e.g. FUOVERFLOW.COM) and sharpens dark Vietnamese text.
   */
  function binarizeCanvas(canvas, threshold = 160) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Luminance formula
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < threshold) {
        // Dark text -> Crisp black
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      } else {
        // Watermark or light grey background -> Pure white
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Preprocess image and crop functional quiz regions:
   * 1. contentCanvas: Right of red divider (contains BOTH question prompt AND options A, B, C, D)
   * 2. typeCanvas: Top-left panel (contains "(Choose 1 answer)" or "(Choose 2 answers)")
   */
  function analyzeAndCropImage(img, splitLayout = true) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    if (!splitLayout || img.width < 500) {
      binarizeCanvas(canvas, 160);
      return {
        fullCanvas: canvas,
        contentCanvas: canvas,
        typeCanvas: null,
        isTwoColumnLayout: false
      };
    }

    const dividerX = findVerticalRedDivider(ctx, img.width, img.height);
    const isTwoColumn = dividerX !== -1;
    const divX = isTwoColumn ? dividerX : Math.floor(img.width * 0.40);

    // 1. CONTENT CANVAS (Right Panel: Question + Options A, B, C, D)
    const cStartX = divX + 4;
    const cStartY = Math.max(0, Math.floor(img.height * 0.035));
    const cWidth = Math.max(100, img.width - cStartX - Math.floor(img.width * 0.015));
    // The white question box occupies up to ~60% height in FUOverflow
    const cHeight = Math.max(150, Math.floor(img.height * 0.58));

    const contentCanvas = document.createElement('canvas');
    contentCanvas.width = cWidth;
    contentCanvas.height = cHeight;
    const cCtx = contentCanvas.getContext('2d');
    cCtx.drawImage(canvas, cStartX, cStartY, cWidth, cHeight, 0, 0, cWidth, cHeight);
    // Remove watermark and sharpen text
    binarizeCanvas(contentCanvas, 165);

    // 2. TYPE CANVAS (Left Panel Top: "(Choose 1 answer)" / "(Choose 2 answers)")
    const tWidth = Math.max(100, divX);
    const tHeight = Math.max(50, Math.floor(img.height * 0.16));
    const typeCanvas = document.createElement('canvas');
    typeCanvas.width = tWidth;
    typeCanvas.height = tHeight;
    const tCtx = typeCanvas.getContext('2d');
    tCtx.drawImage(canvas, 0, 0, tWidth, tHeight, 0, 0, tWidth, tHeight);
    binarizeCanvas(typeCanvas, 160);

    return {
      fullCanvas: canvas,
      contentCanvas,
      typeCanvas,
      isTwoColumnLayout: isTwoColumn,
      dividerX: divX
    };
  }

  /**
   * Clean noise and site headers from raw text
   */
  function cleanRawLine(line) {
    if (!line) return "";
    let l = line.trim();
    // Filter noise
    if (/^(?:fuoverflow|FUOVERFLOW\.COM|are \d+ questions|progress of answering|Back|Next|Exit|Answer)/i.test(l)) {
      return "";
    }
    // Remove leading border artefacts
    l = l.replace(/^[\[\]\|\/\\Il1:;\s]+/, '').trim();
    // Normalize OCR misread of 'C.' as 'G..' or 'G.'
    l = l.replace(/^G\.\.?\s+/i, 'C. ');
    return l;
  }

  /**
   * Parse Question Text and Options from the Right Box text
   */
  function parseQuizContentFromText(rawText) {
    if (!rawText) {
      return {
        question: "",
        options: []
      };
    }

    const lines = rawText.split(/\r?\n/)
      .map(cleanRawLine)
      .filter(Boolean);

    const optRegex = /^(?:[-*•\s]*)?([A-Da-d])\s*[\.\:\)\-]\s*(.*)/;
    const options = [];
    const questionLines = [];
    let currentOpt = null;
    let foundFirstOption = false;

    for (const line of lines) {
      // Filter out MULTIPLE CHOICE header
      if (/^MULTIPLE\s+CHOICE\b/i.test(line)) {
        const withoutHeader = line.replace(/^MULTIPLE\s+CHOICE\s*/i, '').trim();
        if (withoutHeader) questionLines.push(withoutHeader);
        continue;
      }

      const match = line.match(optRegex);
      if (match) {
        foundFirstOption = true;
        const key = match[1].toUpperCase();
        const text = match[2].trim();
        currentOpt = { key, text };
        options.push(currentOpt);
      } else if (foundFirstOption && currentOpt) {
        // Multi-line continuation of current option
        currentOpt.text += " " + line;
      } else if (!foundFirstOption) {
        // Still part of the question prompt
        questionLines.push(line);
      }
    }

    let question = questionLines.join(" ").trim();
    question = question.replace(/^[\[\]\|\/\\Il1:;\s]+/, '').trim();
    question = question.replace(/\s*:\s*$/, '').trim();

    // Clean option texts
    for (const opt of options) {
      opt.text = opt.text.replace(/\s+/g, ' ').trim();
    }

    // Fallback if options were not separated cleanly
    if (options.length === 0 && question) {
      // Try inline search for "A. ... B. ... C. ... D. ..."
      const inlineMatches = [...question.matchAll(/(?:^|\s+)([A-D])\s*[\.\:\)]\s+([^A-D\.\:\)]+)/g)];
      if (inlineMatches.length >= 2) {
        const firstIdx = question.search(/\b[A-D]\s*[\.\:\)]/);
        const actualQuestion = question.substring(0, firstIdx).trim();
        const parsedInlineOpts = inlineMatches.map(m => ({
          key: m[1].toUpperCase(),
          text: m[2].trim()
        }));
        return {
          question: actualQuestion || question,
          options: parsedInlineOpts
        };
      }
    }

    return {
      question,
      options
    };
  }

  /**
   * Determine question type from left panel text
   */
  function detectQuestionType(typeRawText) {
    if (!typeRawText) return "single";
    if (/\(Choose\s+2\s+answer/i.test(typeRawText) || /chọn\s+2\s+đáp\s+án/i.test(typeRawText)) {
      return "multiple";
    }
    return "single";
  }

  /**
   * Load File object to HTML Image
   */
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Không thể mở file ảnh ${file.name}`));
      };
      img.src = url;
    });
  }

  /**
   * Process a single quiz image
   */
  async function processSingleImage(file, worker, options = {}) {
    const { splitLayout = true, assignedId = null } = options;
    const img = await loadImageFromFile(file);
    const { contentCanvas, typeCanvas, fullCanvas, isTwoColumnLayout } = analyzeAndCropImage(img, splitLayout);

    // 1. Question ID
    const questionId = assignedId || extractIdFromFilename(file.name) || options.fallbackIndex || 1;

    // 2. OCR Question Type from left panel
    let detectedType = "single";
    if (typeCanvas) {
      try {
        const typeRes = await worker.recognize(typeCanvas);
        detectedType = detectQuestionType(typeRes.data.text || '');
      } catch (e) {
        console.warn("Type OCR error:", e);
      }
    }

    // 3. OCR Question + Options from right box
    const contentRes = await worker.recognize(contentCanvas || fullCanvas);
    let { question, options: parsedOpts } = parseQuizContentFromText(contentRes.data.text || '');

    // 4. Fallback if options < 2
    if (parsedOpts.length < 2 && fullCanvas && contentCanvas !== fullCanvas) {
      const fullRes = await worker.recognize(fullCanvas);
      const fallback = parseQuizContentFromText(fullRes.data.text || '');
      if (fallback.options.length >= 2) {
        parsedOpts = fallback.options;
        if (!question) question = fallback.question;
      }
    }

    // Ensure placeholders if completely empty
    if (parsedOpts.length === 0) {
      parsedOpts = [
        { key: "A", text: "N/A" },
        { key: "B", text: "N/A" },
        { key: "C", text: "N/A" },
        { key: "D", text: "N/A" }
      ];
    }

    return {
      id: questionId,
      type: detectedType,
      question: question || `(Câu hỏi ${questionId})`,
      options: parsedOpts
    };
  }

  /**
   * Sort files naturally by exam and question number
   */
  function sortFilesByQuestionNumber(files) {
    return [...files].sort((a, b) => {
      const infoA = extractFileInfo(a.name);
      const infoB = extractFileInfo(b.name);
      if (infoA.sortKey !== infoB.sortKey) return infoA.sortKey - infoB.sortKey;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  /**
   * Batch process image files with sequential IDs
   */
  async function batchProcessImages(files, options = {}, onProgress = null, onLog = null) {
    isCancelled = false;
    const fileArray = sortFilesByQuestionNumber(Array.from(files));
    const total = fileArray.length;

    if (total === 0) {
      throw new Error("Không có file ảnh nào được chọn.");
    }

    if (onLog) onLog(`Bắt đầu xử lý ${total} file ảnh (đã sắp xếp tự nhiên theo đề và câu)...`);
    const lang = options.lang || 'vie+eng';
    const worker = await getWorker(lang, onLog);

    const results = [];
    const errors = [];

    for (let i = 0; i < total; i++) {
      if (isCancelled) {
        if (onLog) onLog("Đã hủy tiến trình theo yêu cầu.");
        break;
      }

      const file = fileArray[i];
      const current = i + 1;
      const percent = Math.round((current / total) * 100);

      if (onProgress) {
        onProgress({
          current,
          total,
          percent,
          currentFileName: file.name,
          status: `Đang quét OCR ảnh ${current}/${total}: ${file.name}`
        });
      }

      try {
        // Sequential unique ID: 1, 2, 3, ... (guaranteed no duplicates)
        const questionData = await processSingleImage(file, worker, {
          splitLayout: options.splitLayout !== false,
          fallbackIndex: current,
          assignedId: current
        });
        results.push(questionData);
      } catch (err) {
        console.error(`Lỗi khi quét ảnh ${file.name}:`, err);
        errors.push({ file: file.name, error: err.message });
        if (onLog) onLog(`⚠️ Bỏ qua ${file.name} do lỗi: ${err.message}`);
      }
    }

    return {
      totalInput: total,
      successCount: results.length,
      questions: results,
      errors
    };
  }

  /**
   * Cancel ongoing batch process
   */
  function cancelBatch() {
    isCancelled = true;
  }

  /**
   * Generate Ready-to-Send AI Prompt from Questions JSON
   */
  function generateAiPrompt(questions, subjectName = "Tư tưởng Hồ Chí Minh (HCM202)") {
    const jsonStr = JSON.stringify(questions, null, 2);
    return `Bạn là chuyên gia giảng viên và khảo thí môn ${subjectName}.

Dưới đây là danh sách câu hỏi trắc nghiệm dưới dạng JSON được trích xuất từ đề thi:
NHIỆM VỤ CỦA BẠN:
1. Đọc kỹ nội dung từng câu hỏi và các phương án A, B, C, D (hoặc E).
2. Xác định đáp án ĐÚNG CHÍNH XÁC nhất cho từng câu:
   - Nếu câu hỏi có type "single": điền mảng 1 đáp án, ví dụ: "correctAnswers": ["C"]
   - Nếu câu hỏi có type "multiple" (chọn 2 đáp án): điền mảng các đáp án, ví dụ: "correctAnswers": ["A", "C"]
3. Bổ sung trường "explanation": "Giải thích ngắn gọn căn cứ giáo trình" cho mỗi câu.
4. GIỮ NGUYÊN cấu trúc "id", "type", "question", "options" của từng câu.
5. TRẢ VỀ DUY NHẤT một khối mã JSON hợp lệ (trong \`\`\`json ... \`\`\`), để tôi có thể nạp thẳng vào Web App ôn thi.

DANH SÁCH CÂU HỎI JSON CẦN GIẢI:
\`\`\`json
${jsonStr}
\`\`\``;
  }

  /**
   * Helper to convert File object to Base64 data string
   */
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        const commaIdx = res.indexOf(',');
        resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * High-accuracy Vision AI extraction directly from browser using Gemini 2.5 Flash
   */
  async function processWithGeminiVision(files, options = {}, onProgress = null, onLog = null) {
    isCancelled = false;
    const apiKey = options.apiKey || "";
    const autoSolve = options.autoSolve !== false;
    const batchSize = options.batchSize || 4;

    const fileArray = sortFilesByQuestionNumber(Array.from(files));
    const total = fileArray.length;

    if (total === 0) {
      throw new Error("Không có file ảnh nào được chọn.");
    }

    if (onLog) onLog(`Bắt đầu xử lý ${total} file ảnh bằng Gemini 2.5 Flash Vision...`);

    const results = [];
    const errors = [];

    // Chunk files into batches of batchSize
    const batches = [];
    for (let i = 0; i < total; i += batchSize) {
      batches.push(fileArray.slice(i, i + batchSize));
    }

    const totalBatches = batches.length;

    for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
      if (isCancelled) {
        if (onLog) onLog("Đã hủy tiến trình theo yêu cầu.");
        break;
      }

      const batch = batches[bIdx];
      const currentCount = Math.min(total, (bIdx + 1) * batchSize);
      const percent = Math.round((currentCount / total) * 100);

      if (onProgress) {
        onProgress({
          current: currentCount,
          total,
          percent,
          currentFileName: batch.map(f => f.name).join(', '),
          status: `Đang gửi batch ${bIdx + 1}/${totalBatches} (${batch.length} ảnh) tới Gemini 2.5 Flash...`
        });
      }

      try {
        const parts = [];
        const prompt = autoSolve ?
          `Bạn là chuyên gia giảng viên và khảo thí môn Tư tưởng Hồ Chí Minh (HCM202).\n` +
          `Dưới đây là ${batch.length} ảnh chụp màn hình câu hỏi thi trắc nghiệm (giao diện FUOverflow).\n` +
          `NHIỆM VỤ:\n` +
          `1. Trích xuất chính xác câu hỏi và các lựa chọn A, B, C, D từ khung màu trắng bên phải vạch đỏ.\n` +
          `2. Kiểm tra panel bên trái vạch đỏ: nếu có '(Choose 2 answer)' thì type là 'multiple', nếu '(Choose 1 answer)' thì type là 'single'.\n` +
          `3. Xác định đáp án ĐÚNG CHÍNH XÁC nhất (correctAnswers: ['...']) và giải thích ngắn gọn (explanation: '...') dựa trên giáo trình Tư tưởng Hồ Chí Minh.\n` +
          `4. Trả về DUY NHẤT một mảng JSON các object theo đúng thứ tự ảnh:\n` +
          `[{"imageName": "...", "type": "single", "question": "...", "options": [{"key": "A", "text": "..."}], "correctAnswers": ["C"], "explanation": "..."}]`
          :
          `Bạn là hệ thống OCR thị giác trích xuất câu hỏi trắc nghiệm tiếng Việt từ ảnh đề thi FUOverflow.\n` +
          `Dưới đây là ${batch.length} ảnh đề thi.\n` +
          `NHIỆM VỤ:\n` +
          `1. Đọc chính xác nội dung câu hỏi và các phương án A, B, C, D từ khung màu trắng bên phải vạch đỏ.\n` +
          `2. Đọc panel bên trái: nếu '(Choose 2 answer)' thì type là 'multiple', nếu '(Choose 1 answer)' thì type là 'single'.\n` +
          `3. TUYỆT ĐỐI KHÔNG giải đề, KHÔNG thêm đáp án đúng.\n` +
          `4. Trả về DUY NHẤT một mảng JSON các câu hỏi nguyên bản theo đúng thứ tự ảnh:\n` +
          `[{"imageName": "...", "type": "single", "question": "...", "options": [{"key": "A", "text": "..."}]}]`;

        parts.push({ text: prompt });

        for (let idx = 0; idx < batch.length; idx++) {
          const file = batch[idx];
          const b64 = await readFileAsBase64(file);
          parts.push({ text: `--- Ảnh ${idx + 1}: ${file.name} ---` });
          parts.push({
            inline_data: {
              mime_type: file.type || 'image/webp',
              data: b64
            }
          });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const resData = await response.json();
        const rawJsonText = resData.candidates[0].content.parts[0].text;
        let parsed = JSON.parse(rawJsonText);
        if (parsed.questions && Array.isArray(parsed.questions)) parsed = parsed.questions;
        if (!Array.isArray(parsed)) parsed = [parsed];

        parsed.forEach((item, idx) => {
          const originalFile = batch[idx] || batch[0];
          results.push({
            id: results.length + 1,
            type: item.type || 'single',
            question: item.question || '',
            options: item.options || [],
            correctAnswers: item.correctAnswers || ['A'],
            explanation: item.explanation || '',
            imageSource: originalFile.name
          });
        });

      } catch (err) {
        console.error("Gemini batch error:", err);
        errors.push({ batch: bIdx + 1, error: err.message });
        if (onLog) onLog(`⚠️ Lỗi batch ${bIdx + 1}: ${err.message}`);
      }

      // Safe pause between batches (3 seconds)
      if (bIdx < totalBatches - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    return {
      totalInput: total,
      successCount: results.length,
      questions: results,
      errors
    };
  }

  return {
    getWorker,
    extractIdFromFilename,
    batchProcessImages,
    processWithGeminiVision,
    cancelBatch,
    generateAiPrompt
  };
})();
