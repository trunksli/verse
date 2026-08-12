import fs from 'fs';
import path from 'path';

interface BibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

// Resolve from the compiled dist/ dir first, then fall back to src/ so the
// module works whether it runs via ts-node (src) or after `tsc` (dist).
const candidatePaths = [
  path.join(__dirname, 'bible-kjv.json'),
  path.join(__dirname, '..', 'src', 'bible-kjv.json'),
];

function loadBible(): BibleBook[] {
  for (const candidate of candidatePaths) {
    if (!fs.existsSync(candidate)) continue;
    let fileContent = fs.readFileSync(candidate, 'utf8');
    // Strip UTF-8 BOM if present (common in GitHub raw downloads)
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }
    return JSON.parse(fileContent);
  }
  // Failing loudly here beats booting a server that silently discards every
  // verse as "unverifiable" because the database never loaded.
  throw new Error(
    `Could not load bible-kjv.json. Looked in:\n  ${candidatePaths.join('\n  ')}\n` +
      `Run \`node download.js\` to fetch it, and make sure the build copies it into dist/.`
  );
}

const bibleData: BibleBook[] = loadBible();

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

// Curly braces in this KJV source mean two different things, and they have to
// be treated differently:
//
//   1. Translator's notes  -- "{firmament: Heb. expansion}". These gloss a word
//      and are not part of the verse. They always contain a colon (or, in four
//      cases across the whole corpus, an explicit "Heb."/"or," marker).
//      These get dropped entirely.
//
//   2. Supplied words -- "{is}", "{was}", "{and}". Italicised in printed KJVs
//      to show they were added for English grammar and have no counterpart in
//      the Hebrew/Greek. They ARE part of the verse. These get unwrapped.
//
// Supplied words outnumber notes ~29,000 to ~140, so deleting both classes
// (the previous behaviour) mangled 56% of all verses -- Psalm 23:1 came out as
// "The LORD my shepherd; I shall not want."
const TRANSLATOR_NOTE = /\{[^}]*(?::|\b(?:Heb|Gr|Chal|Sam)\.|,\s*or,)[^}]*\}/g;
const SUPPLIED_WORDS = /\{([^}]*)\}/g;

export function cleanVerseText(raw: string): string {
  return raw
    .replace(TRANSLATOR_NOTE, '')
    .replace(SUPPLIED_WORDS, '$1')
    // Four verses in this source (e.g. Romans 16:27) carry an unbalanced brace
    // that neither pass above can pair up. Drop any orphans left behind.
    .replace(/[{}]/g, '')
    .replace(/\s+([,;:.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches the text for a given book, chapter, and verse range.
 * Returns null if the reference does not resolve, which is what lets the
 * caller filter out hallucinated citations. See cleanVerseText for how the
 * KJV's brace notation is handled.
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
    versesList.push(`${i + 1} ${cleanVerseText(chapter[i])}`);
  }
  
  const formattedRef = `${resolvedBookName} ${chapterNum}:${verseStart}${
    clampedEndIdx > startIdx ? `-${clampedEndIdx + 1}` : ''
  }`;
  
  return {
    reference: formattedRef,
    text: versesList.join(' ')
  };
}
