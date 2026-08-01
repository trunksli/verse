const fs = require('fs');
const https = require('https');
const path = require('path');

const destDir = path.join(__dirname, 'src');
const destFile = path.join(destDir, 'bible-kjv.json');
const url = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Downloading Bible KJV JSON...');
const file = fs.createWriteStream(destFile);

https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    process.exit(1);
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('Download complete and saved to:', destFile);
  });
}).on('error', (err) => {
  fs.unlink(destFile, () => {});
  console.error('Error downloading file:', err.message);
  process.exit(1);
});
