const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const worker = await Tesseract.createWorker(['eng', 'vie']);
  console.log("Worker ready");
  const testImg = 'HCM202/HCM202_SP2025_FE_21 (6).webp';
  
  const start = Date.now();
  // Crop rectangle: left panel around question type
  // In FUOverflow, the left panel is roughly top 50 to 250, left 50 to 450
  const ret = await worker.recognize(testImg, {
    rectangle: { top: 30, left: 20, width: 450, height: 250 }
  });
  console.log("Time (ms):", Date.now() - start);
  console.log("Cropped text:", JSON.stringify(ret.data.text));
  await worker.terminate();
}

main();
