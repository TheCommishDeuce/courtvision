/** The Lab's example questions, parsed from examples.sql (the single source). */
import raw from './examples.sql?raw';

export interface LabExample {
  id: string;
  question: string;
  teaser: string;
  sql: string;
}

export function parseExamples(text: string): LabExample[] {
  return text
    .split(/^-- @id: /m)
    .slice(1)
    .map(block => {
      const lines = block.split('\n');
      const id = lines[0].trim();
      const tag = (name: string) => lines.find(l => l.startsWith(`-- @${name}: `))?.slice(name.length + 6).trim() ?? '';
      const sql = lines
        .slice(1)
        .filter(l => !l.startsWith('-- @'))
        .join('\n')
        .trim();
      return { id, question: tag('question'), teaser: tag('teaser'), sql };
    });
}

export const LAB_EXAMPLES: LabExample[] = parseExamples(raw);

export const labExample = (id: string | null | undefined): LabExample | undefined =>
  id ? LAB_EXAMPLES.find(e => e.id === id) : undefined;
