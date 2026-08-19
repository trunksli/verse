const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SELECTION_GUIDANCE,
  buildRequestDirective,
  recordServedReferences,
  getRecentReferences,
  resetRecentReferences,
  pickLens,
} = require('../dist/verseSelection');

test('selection guidance', async (t) => {
  await t.test('names the verses that would otherwise dominate every answer', () => {
    for (const ref of ['Psalms 23', 'Jeremiah 29:11', 'Philippians 4:13', 'Romans 8:28']) {
      assert.ok(SELECTION_GUIDANCE.includes(ref), `missing ${ref}`);
    }
  });

  await t.test('discourages rather than bans them', () => {
    // A hard ban would be wrong: sometimes the famous verse really is the right
    // one. The guidance has to leave that door open.
    assert.match(SELECTION_GUIDANCE, /LAST resort|genuinely the best/);
  });

  await t.test('keeps relevance ahead of novelty', () => {
    assert.match(SELECTION_GUIDANCE, /never pick an\s+obscure verse that does not actually address/);
  });
});

test('rotating lens', async (t) => {
  await t.test('varies across calls', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(pickLens());
    assert.ok(seen.size > 5, `expected variety, saw ${seen.size} distinct lenses`);
  });

  await t.test('is deterministic given a seeded random', () => {
    assert.equal(pickLens(() => 0), pickLens(() => 0));
    assert.notEqual(pickLens(() => 0), pickLens(() => 0.99));
  });
});

test('recent-reference memory', async (t) => {
  t.beforeEach(() => resetRecentReferences());

  await t.test('records what was served', () => {
    recordServedReferences(['Job 2:11-13', 'Micah 7:8']);
    assert.deepEqual(getRecentReferences(), ['Job 2:11-13', 'Micah 7:8']);
  });

  await t.test('re-serving moves a reference to newest instead of duplicating', () => {
    recordServedReferences(['A', 'B']);
    recordServedReferences(['A']);
    assert.deepEqual(getRecentReferences(), ['B', 'A']);
  });

  await t.test('is bounded so a long-running instance cannot grow without limit', () => {
    for (let i = 0; i < 500; i++) recordServedReferences([`Ref ${i}`]);
    const recent = getRecentReferences();
    assert.ok(recent.length <= 48, `capacity exceeded: ${recent.length}`);
    assert.equal(recent.at(-1), 'Ref 499', 'newest is kept');
  });
});

test('per-request directive', async (t) => {
  t.beforeEach(() => resetRecentReferences());

  await t.test('carries the user query through unchanged', () => {
    assert.ok(buildRequestDirective('I feel anxious').startsWith('I feel anxious'));
  });

  await t.test('injects the lens without leaking it to the reader', () => {
    const d = buildRequestDirective('q', 'the permission to lament honestly');
    assert.match(d, /the permission to lament honestly/);
    assert.match(d, /do not mention the lens itself/);
  });

  await t.test('passes recently served verses as an avoid-list', () => {
    recordServedReferences(['Psalms 23:4', 'Matthew 5:4']);
    const d = buildRequestDirective('grief');
    assert.match(d, /Psalms 23:4/);
    assert.match(d, /Matthew 5:4/);
    assert.match(d, /Choose differently/);
  });

  await t.test('omits the avoid-list section when nothing has been served yet', () => {
    assert.doesNotMatch(buildRequestDirective('grief'), /Choose differently/);
  });

  await t.test('caps how many recent verses are sent, to bound prompt growth', () => {
    for (let i = 0; i < 40; i++) recordServedReferences([`Book ${i}:1`]);
    const d = buildRequestDirective('q');
    const mentioned = [...d.matchAll(/Book \d+:1/g)].length;
    assert.ok(mentioned <= 16, `sent ${mentioned} refs, expected <= 16`);
  });
});
