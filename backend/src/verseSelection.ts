/**
 * Keeps the advisor from reaching for the same handful of famous verses every
 * time. Left alone, an LLM asked about grief returns Psalm 23:4 essentially
 * always -- it is the highest-probability answer, not the most pastorally useful
 * one, and a user who asks twice notices immediately.
 *
 * Three independent nudges, because no single one is reliable:
 *   1. A standing instruction to treat the canonical greatest hits as a last
 *      resort rather than a first reach.
 *   2. A rotating interpretive lens, so identical queries take different angles
 *      across requests instead of collapsing onto one answer.
 *   3. A short memory of what was served recently, fed back as an avoid-list.
 *
 * None of this weakens the verification layer: the model still returns only
 * book/chapter/verse, and getVersesText still discards anything that does not
 * resolve against the local KJV.
 */

/**
 * The verses that dominate search results, devotional calendars, and wall art.
 * Not banned -- sometimes one of these genuinely is the right passage -- but the
 * model has to earn them rather than defaulting to them.
 */
const OVERUSED_REFERENCES = [
  'Jeremiah 29:11',
  'Psalms 23 (any verse)',
  'Philippians 4:13',
  'Romans 8:28',
  'John 3:16',
  'Proverbs 3:5-6',
  'Isaiah 41:10',
  'Isaiah 40:31',
  'Matthew 6:33',
  'Matthew 11:28',
  'Philippians 4:6-7',
  'Joshua 1:9',
  'Romans 12:2',
  '1 Corinthians 13:4-7',
  'Psalms 46:10',
  '2 Corinthians 12:9',
];

/**
 * Books the model reaches for by default. Requiring one verse from outside this
 * set is a structural constraint, which works far better than asking for
 * "variety" in the abstract.
 */
const OVER_REPRESENTED_BOOKS = [
  'Psalms',
  'John',
  'Romans',
  'Philippians',
  'Proverbs',
  'Isaiah',
  'Matthew',
];

/**
 * Rotating angle of approach. Grief read through "permission to lament" lands on
 * different passages than grief read through "the hope of resurrection" -- both
 * faithful, both useful, and rotating between them is what stops the app from
 * having one answer per topic.
 */
const LENSES = [
  'the permission to lament honestly, without tidying the feeling up',
  'the nearness of God to people in this exact condition',
  'a concrete next step or practical instruction',
  'hope and eventual restoration, without rushing past the present',
  'being carried by community rather than coping alone',
  "God's own character and track record of faithfulness",
  'honesty in prayer, including complaint and unanswered questions',
  'endurance over a long stretch rather than instant relief',
  'humility, surrender, and releasing what cannot be controlled',
  'the example of a specific biblical figure who lived through this',
  'what is worth holding onto when circumstances do not change',
  'rest, limits, and the goodness of not being self-sufficient',
];

export function pickLens(random: () => number = Math.random): string {
  return LENSES[Math.floor(random() * LENSES.length)];
}

/**
 * Recently served references, newest last. In-memory and per-instance: it resets
 * on deploy and is not shared across instances. That is a deliberate tradeoff --
 * the project has no database, and an imperfect memory still fixes the case that
 * actually bothers users (the same verse twice in one sitting).
 */
const RECENT_CAPACITY = 48;
const RECENT_SHOWN_TO_MODEL = 16;
const recentReferences: string[] = [];

export function recordServedReferences(references: string[]): void {
  for (const reference of references) {
    const existing = recentReferences.indexOf(reference);
    if (existing !== -1) recentReferences.splice(existing, 1);
    recentReferences.push(reference);
  }
  while (recentReferences.length > RECENT_CAPACITY) recentReferences.shift();
}

export function getRecentReferences(): string[] {
  return [...recentReferences];
}

/** Test seam -- production never calls this. */
export function resetRecentReferences(): void {
  recentReferences.length = 0;
}

/** Standing guidance. Stable across requests, so it belongs in the system prompt. */
export const SELECTION_GUIDANCE = `
Choosing which verses to cite:
- Reach past the obvious. For any given theme there are two or three verses that
  everyone already knows; they are the ones most likely to feel generic, and a
  person in real distress has usually heard them already. Treat the following as
  a LAST resort, and only cite one when it is genuinely the best passage for this
  specific situation rather than merely the most familiar one:
  ${OVERUSED_REFERENCES.join('; ')}.
- When you do cite a well-known verse, do not cite it alone. Pair it with a less
  familiar passage that says something the famous one does not.
- Unless the user's query points somewhere specific, at least one of your verses
  should come from outside these heavily-quoted books:
  ${OVER_REPRESENTED_BOOKS.join(', ')}.
- The whole canon is available: narrative, the prophets, wisdom literature,
  lament psalms beyond the famous few, the minor prophets, and the epistles all
  speak to ordinary human situations. A lesser-known passage that fits precisely
  is worth far more than a famous one that fits loosely.
- Do not stack all your verses on one theme or one book. Each should add
  something the others do not.
- Precision beats familiarity, but relevance still comes first: never pick an
  obscure verse that does not actually address what the person described.
`.trim();

/**
 * Per-request guidance. Varies every call, so it goes in the user turn rather
 * than the system prompt.
 */
export function buildRequestDirective(
  query: string,
  lens: string = pickLens(),
  recent: string[] = recentReferences,
): string {
  const avoid = recent.slice(-RECENT_SHOWN_TO_MODEL);
  const avoidBlock = avoid.length
    ? `\n\nThese were served to other users very recently. Choose differently unless one is clearly the single best fit for this situation:\n${avoid.join('; ')}.`
    : '';

  return `${query}\n\nFor this response, approach the situation through this lens: ${lens}. Let it shape which passages you choose, but do not mention the lens itself or let it override what the person actually described.${avoidBlock}`;
}
