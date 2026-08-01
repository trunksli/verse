import fs from 'fs';
import path from 'path';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

const biblePath = path.join(__dirname, 'bible-kjv.json');
let bibleData: BibleBook[] = [];

try {
  let fileContent = fs.readFileSync(biblePath, 'utf8');
  // Strip UTF-8 BOM if present (common in GitHub raw downloads)
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }
  bibleData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error loading bible-kjv.json:', error);
}

const aliasMap = new Map<string, string>();

function normalizeBookAlias(name: string): string {
  return name.toLowerCase()
    .replace(/^first\s+/, '1 ')
    .replace(/^second\s+/, '2 ')
    .replace(/^third\s+/, '3 ')
    .replace(/^i\s+/, '1 ')
    .replace(/^ii\s+/, '2 ')
    .replace(/^iii\s+/, '3 ')
    .replace(/[^a-z0-9]/g, '');
}

// Initialize abbreviation and name mapping
export function initBibleDatabase() {
  for (const book of bibleData) {
    const normName = normalizeBookAlias(book.name);
    aliasMap.set(normName, book.name);
    
    const normAbbrev = normalizeBookAlias(book.abbrev);
    aliasMap.set(normAbbrev, book.name);
  }
  
  // Add common abbreviations/aliases
  const extraAliases: Record<string, string> = {
    'gen': 'Genesis',
    'ex': 'Exodus',
    'exod': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers',
    'deut': 'Deuteronomy',
    'josh': 'Joshua',
    'judg': 'Judges',
    'ruth': 'Ruth',
    '1sam': '1 Samuel',
    '2sam': '2 Samuel',
    '1ki': '1 Kings',
    '2ki': '2 Kings',
    '1chron': '1 Chronicles',
    '2chron': '2 Chronicles',
    'ezr': 'Ezra',
    'neh': 'Nehemiah',
    'est': 'Esther',
    'job': 'Job',
    'ps': 'Psalms',
    'psa': 'Psalms',
    'psalm': 'Psalms',
    'prov': 'Proverbs',
    'eccl': 'Ecclesiastes',
    'song': 'Solomon', // Song of Solomon is named "Solomon" or "Song of Solomon"
    'isa': 'Isaiah',
    'jer': 'Jeremiah',
    'lam': 'Lamentations',
    'ezek': 'Ezekiel',
    'dan': 'Daniel',
    'hos': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obad': 'Obadiah',
    'jon': 'Jonah',
    'mic': 'Micah',
    'nah': 'Nahum',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'matt': 'Matthew',
    'mat': 'Matthew',
    'mk': 'Mark',
    'mar': 'Mark',
    'lk': 'Luke',
    'luk': 'Luke',
    'jn': 'John',
    'joh': 'John',
    'act': 'Acts',
    'acts': 'Acts',
    'rom': 'Romans',
    '1cor': '1 Corinthians',
    '2cor': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'phil': 'Philippians',
    'col': 'Colossians',
    '1thess': '1 Thessalonians',
    '2thess': '2 Thessalonians',
    '1tim': '1 Timothy',
    '2tim': '2 Timothy',
    'tit': 'Titus',
    'philem': 'Philemon',
    'heb': 'Hebrews',
    'jas': 'James',
    'jam': 'James',
    '1pet': '1 Peter',
    '2pet': '2 Peter',
    '1jn': '1 John',
    '2jn': '2 John',
    '3jn': '3 John',
    'jude': 'Jude',
    'rev': 'Revelation',
    'revelation': 'Revelation',
  };
  
  for (const [key, value] of Object.entries(extraAliases)) {
    aliasMap.set(normalizeBookAlias(key), value);
  }
}

// Call init right away
initBibleDatabase();

export interface VerseResult {
  reference: string;
  text: string;
}

/**
 * Fetches the text for a given book, chapter, and verse range.
 * Cleans up KJV bracket notation {was} and {Heb. ...}
 */
export function getVersesText(
  bookName: string,
  chapterNum: number,
  verseStart: number,
  verseEnd?: number
): VerseResult | null {
  const normInput = normalizeBookAlias(bookName);
  const resolvedBookName = aliasMap.get(normInput);
  
  if (!resolvedBookName) {
    console.warn(`Book name not found for: "${bookName}" (normalized: "${normInput}")`);
    return null;
  }
  
  const book = bibleData.find((b) => b.name === resolvedBookName);
  if (!book) {
    return null;
  }
  
  const chapterIdx = chapterNum - 1;
  if (chapterIdx < 0 || chapterIdx >= book.chapters.length) {
    console.warn(`Chapter ${chapterNum} out of range for book "${resolvedBookName}"`);
    return null;
  }
  
  const chapter = book.chapters[chapterIdx];
  const startIdx = verseStart - 1;
  const endIdx = (verseEnd || verseStart) - 1;
  
  if (startIdx < 0 || startIdx >= chapter.length) {
    console.warn(`Verse ${verseStart} out of range for "${resolvedBookName}" Chapter ${chapterNum}`);
    return null;
  }
  
  const clampedEndIdx = Math.min(Math.max(startIdx, endIdx), chapter.length - 1);
  const versesList: string[] = [];
  
  for (let i = startIdx; i <= clampedEndIdx; i++) {
    // KJV files often contain translators notes in curly braces: e.g. "{was}" or "{Heb. ...}"
    // We clean these up so they read as a modern, clean verse
    const cleanText = chapter[i]
      .replace(/\{[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    versesList.push(`${i + 1} ${cleanText}`);
  }
  
  const formattedRef = `${resolvedBookName} ${chapterNum}:${verseStart}${
    clampedEndIdx > startIdx ? `-${clampedEndIdx + 1}` : ''
  }`;
  
  return {
    reference: formattedRef,
    text: versesList.join(' ')
  };
}
