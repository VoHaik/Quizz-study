const fs = require('fs');

let iteMd = fs.readFileSync('./ite302c_data.md', 'utf8');

// Fix any remaining backB lash or powAB erful or stray AB/CD inside words
iteMd = iteMd.replace(/backB\s*lash/g, 'backlash');
iteMd = iteMd.replace(/powAB\s*erful/g, 'powerful');
iteMd = iteMd.replace(/generD\s*ate/g, 'generate');
iteMd = iteMd.replace(/inciBC\s*dent/g, 'incident');
iteMd = iteMd.replace(/estiD\s*mate/g, 'estimate');
iteMd = iteMd.replace(/happenC\s*ing/g, 'happening');

// Clean any uppercase letter inserted inside words e.g. "wordA word" -> "word word" if corrupted
iteMd = iteMd.replace(/([a-z]+)[A-E]{1,2}\s+([a-z]+)/g, '$1 $2');

fs.writeFileSync('./ite302c_data.md', iteMd, 'utf8');
console.log('Cleaned all word corruptions in ite302c_data.md successfully!');
