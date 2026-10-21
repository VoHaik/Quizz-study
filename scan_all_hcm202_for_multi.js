const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function scan() {
  const dataset = JSON.parse(fs.readFileSync('HCM202_dataset.json', 'utf8'));
  console.log(`Loaded ${dataset.length} questions from HCM202_dataset.json`);

  const worker = await Tesseract.createWorker(['eng']);
  console.log('Tesseract worker initialized.');

  const multiQuestions = [];
  const startTotal = Date.now();

  for (let i = 0; i < dataset.length; i++) {
    const q = dataset[i];
    const imgPath = path.join('HCM202', q.imageSource);

    try {
      const res = await worker.recognize(imgPath, {
        rectangle: { top: 30, left: 20, width: 450, height: 250 }
      });
      const txt = res.data.text || '';
      
      const isChoose2 = /choose\s*2/i.test(txt) || /2\s*answer/i.test(txt);
      const isMulti = /multiple/i.test(txt);

      if (isChoose2 || isMulti) {
        multiQuestions.push({
          id: q.id,
          imageSource: q.imageSource,
          detectedText: txt.replace(/\n+/g, ' ').trim(),
          currentType: q.type,
          currentQuestion: q.question,
          currentAnswers: q.correctAnswers
        });
        console.log(`[FOUND MULTI] ID ${q.id} (${q.imageSource}): ${txt.replace(/\n+/g, ' ').trim()}`);
      }
    } catch (err) {
      console.error(`Error on ID ${q.id} (${q.imageSource}):`, err.message);
    }

    if ((i + 1) % 50 === 0 || i === dataset.length - 1) {
      console.log(`Scanned ${i + 1}/${dataset.length} images... (Elapsed: ${Math.round((Date.now() - startTotal)/1000)}s)`);
    }
  }

  await worker.terminate();

  console.log(`\n=== SCAN COMPLETED ===`);
  console.log(`Total questions detected as multi-choice / choose 2: ${multiQuestions.length}`);
  console.log(JSON.stringify(multiQuestions, null, 2));

  fs.writeFileSync('detected_multi_questions.json', JSON.stringify(multiQuestions, null, 2), 'utf8');
}

scan();
