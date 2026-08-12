const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { cleanVerseText } = require('../dist/bibleUtils');

const DIST_JSON = path.join(__dirname, '..', 'dist', 'bible-kjv.json');

function loadRaw(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  return JSON.parse(content);
}

// The build used to emit only .js, leaving the server unable to load its own
// database and silently discarding every verse as unverifiable.
test('build ships the bible database into dist/', () => {
  assert.ok(fs.existsSync(DIST_JSON), 'dist/bible-kjv.json missing - `npm run copy:data` did not run');
});

test('database shape', () => {
  const books = loadRaw(DIST_JSON);
  assert.equal(books.length, 66);
  assert.equal(books[0].name, 'Genesis');
  assert.equal(books.at(-1).name, 'Revelation');
  for (const book of books) {
    assert.ok(book.name && book.abbrev && Array.isArray(book.chapters), `malformed: ${book.name}`);
  }
});

// Sweeping every verse is what caught the original corruption; spot checks did
// not. It runs in well under a second, so there is no reason to sample.
test('every verse survives cleaning intact', () => {
  const books = loadRaw(DIST_JSON);
  const offenders = { braces: [], empty: [], notes: [], doubleSpace: [], spaceBeforePunct: [] };
  let count = 0;

  for (const book of books) {
    book.chapters.forEach((chapter, ci) => {
      chapter.forEach((verse, vi) => {
        count++;
        const ref = `${book.name} ${ci + 1}:${vi + 1}`;
        const cleaned = cleanVerseText(verse);
        if (/[{}]/.test(cleaned)) offenders.braces.push(ref);
        if (!cleaned.trim()) offenders.empty.push(ref);
        if (/\b(?:Heb|Gr|Chal|Sam)\./.test(cleaned)) offenders.notes.push(ref);
        if (/ {2}/.test(cleaned)) offenders.doubleSpace.push(ref);
        if (/\s[,;.!?]/.test(cleaned)) offenders.spaceBeforePunct.push(ref);
      });
    });
  }

  assert.equal(count, 31100, 'unexpected verse count - did the source data change?');
  for (const [kind, refs] of Object.entries(offenders)) {
    assert.deepEqual(refs, [], `${kind}: ${refs.slice(0, 5).join(', ')}${refs.length > 5 ? ` (+${refs.length - 5} more)` : ''}`);
  }
});

// Guards the actual regression: these verses lose a supplied word if the
// brace handling ever reverts to deleting every {...} span.
test('supplied words survive in known-affected verses', () => {
  const books = loadRaw(DIST_JSON);
  const byName = new Map(books.map((b) => [b.name, b]));
  const cases = [
    ['Psalms', 23, 1, /The LORD is my shepherd/],
    ['Genesis', 1, 2, /darkness was upon the face/],
    ['Genesis', 1, 29, /which is upon the face/],
  ];
  for (const [name, ch, v, expected] of cases) {
    const cleaned = cleanVerseText(byName.get(name).chapters[ch - 1][v - 1]);
    assert.match(cleaned, expected, `${name} ${ch}:${v}`);
  }
});
