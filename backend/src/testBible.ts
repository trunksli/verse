import { getVersesText } from './bibleUtils';

console.log('--- Testing Bible Utils ---');

// Test 1: Simple single verse lookup
const test1 = getVersesText('Genesis', 1, 1);
console.log('Gen 1:1 Result:\n', JSON.stringify(test1, null, 2));
console.log('\n---------------------------\n');

// Test 2: Verse range lookup
const test2 = getVersesText('Jeremiah', 29, 11, 12);
console.log('Jer 29:11-12 Result:\n', JSON.stringify(test2, null, 2));
console.log('\n---------------------------\n');

// Test 3: Book abbreviation and case/spacing normalization
const test3 = getVersesText('1cor', 13, 4, 5);
console.log('1 Cor 13:4-5 Result (Abbrev check):\n', JSON.stringify(test3, null, 2));
console.log('\n---------------------------\n');

// Test 4: Roman numeral style book lookup
const test4 = getVersesText('I John', 4, 18);
console.log('1 John 4:18 Result (Roman Numeral check):\n', JSON.stringify(test4, null, 2));
console.log('\n---------------------------\n');

// Test 5: Out of bounds chapter check (should return null safely)
const test5 = getVersesText('Genesis', 60, 1);
console.log('Genesis Chapter 60 (Invalid) Result:\n', test5);
console.log('\n---------------------------\n');
