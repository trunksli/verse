const test = require('node:test');
const assert = require('node:assert/strict');

const { cleanVerseText } = require('../dist/bibleUtils');

// The KJV source uses curly braces for two unrelated things. Conflating them
// silently corrupted ~46% of all verses, so each class gets pinned here.
test('cleanVerseText', async (t) => {
  await t.test('keeps supplied words, dropping only the braces', () => {
    assert.equal(
      cleanVerseText('The LORD {is} my shepherd; I shall not want.'),
      'The LORD is my shepherd; I shall not want.'
    );
    assert.equal(
      cleanVerseText('and darkness {was} upon the face of the deep.'),
      'and darkness was upon the face of the deep.'
    );
  });

  await t.test('keeps multi-word supplied phrases', () => {
    assert.equal(cleanVerseText('He {is} good {to wit} indeed.'), 'He is good to wit indeed.');
  });

  await t.test('removes translator notes entirely', () => {
    assert.equal(
      cleanVerseText('And God called the firmament {firmament: Heb. expansion} Heaven.'),
      'And God called the firmament Heaven.'
    );
    assert.equal(cleanVerseText('a {life: Heb. soul} b'), 'a b');
  });

  await t.test('removes colon-free notes carrying an explicit marker', () => {
    // Only four of these exist in the whole corpus, which is exactly why they
    // are easy to regress.
    assert.equal(cleanVerseText('x {before Heb. with} y'), 'x y');
    assert.equal(cleanVerseText('x {at the... Heb. at the will, or, purpose} y'), 'x y');
  });

  await t.test('strips orphan braces from unbalanced source verses', () => {
    assert.equal(cleanVerseText('sent by Phebe.}'), 'sent by Phebe.');
    assert.doesNotMatch(cleanVerseText('{In} that day {also} he came.}'), /[{}]/);
  });

  await t.test('does not leave a space before punctuation after removing a note', () => {
    assert.equal(cleanVerseText('the word {word: Heb. dabar}, and more'), 'the word, and more');
  });

  await t.test('collapses whitespace and trims', () => {
    assert.equal(cleanVerseText('  a   b  '), 'a b');
  });

  await t.test('leaves brace-free text untouched', () => {
    const plain = 'Jesus wept.';
    assert.equal(cleanVerseText(plain), plain);
  });
});
