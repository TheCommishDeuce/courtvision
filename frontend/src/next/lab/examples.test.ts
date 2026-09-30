import { describe, expect, it } from 'vitest';
import { LAB_EXAMPLES, labExample } from './examples';

describe('Lab examples', () => {
  it('parses all six with question, teaser and SQL', () => {
    expect(LAB_EXAMPLES.map(e => e.id)).toEqual([
      'slam-final-comebacks', 'most-tiebreaks', 'teens-beat-no1', 'slam-upsets', 'most-aces-match', 'bagel-finals',
    ]);
    for (const e of LAB_EXAMPLES) {
      expect(e.question).toMatch(/\?$/);
      expect(e.teaser).toMatch(/^e\.g\. /);
      // Leading comments are allowed, as api/routers/query.py strips them too.
      expect(e.sql.replace(/^(?:\s|--[^\n]*\n)+/, '')).toMatch(/^(SELECT|WITH)\b/);
      expect(e.sql).not.toMatch(/;\s*$/);
    }
  });

  it('keeps explanatory comments inside the SQL', () => {
    expect(labExample('most-aces-match')?.sql).toContain('-- ATP tour level only');
    expect(labExample('nope')).toBeUndefined();
  });
});
