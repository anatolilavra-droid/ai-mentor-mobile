import {
  MAX_BLOCKS,
  isSafeUrl,
  parseInline,
  parseMarkdown,
} from '@/features/chat/markdown/parseMarkdown';

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, lists, code and rules', () => {
    const { blocks } = parseMarkdown(
      [
        '# Title',
        'First line',
        'second line',
        '',
        '- one',
        '- two',
        '',
        '1. first',
        '2. second',
        '',
        '```javascript',
        'const a = 1;',
        '```',
        '---',
        '### Small',
      ].join('\n'),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
      'code',
      'rule',
      'heading',
    ]);
    expect(blocks[2]).toMatchObject({
      ordered: false,
      items: [[{ text: 'one' }], [{ text: 'two' }]],
    });
    expect(blocks[3]).toMatchObject({ ordered: true, start: 1 });
    expect(blocks[4]).toEqual({ type: 'code', language: 'javascript', code: 'const a = 1;' });
    expect(blocks[6]).toMatchObject({ type: 'heading', level: 3 });
  });

  it('keeps an unclosed code fence as code to the end', () => {
    const { blocks } = parseMarkdown('```\nlet a\nlet b');
    expect(blocks).toEqual([{ type: 'code', language: '', code: 'let a\nlet b' }]);
  });

  it('never interprets HTML: tags stay plain text', () => {
    const { blocks } = parseMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        inline: [{ type: 'text', text: '<script>alert(1)</script> <img src=x onerror=alert(1)>' }],
      },
    ]);
  });

  it('caps the length and the number of blocks', () => {
    expect(parseMarkdown('a'.repeat(50), 10).truncated).toBe(true);
    const many = Array.from({ length: MAX_BLOCKS + 50 }, (_, index) => `p${index}`).join('\n\n');
    const result = parseMarkdown(many);
    expect(result.blocks).toHaveLength(MAX_BLOCKS);
    expect(result.truncated).toBe(true);
  });
});

describe('parseInline', () => {
  it('parses bold, italic, code and safe links', () => {
    expect(
      parseInline('**bold** and *it* and `x()` see [docs](https://developer.mozilla.org/)'),
    ).toEqual([
      { type: 'bold', children: [{ type: 'text', text: 'bold' }] },
      { type: 'text', text: ' and ' },
      { type: 'italic', children: [{ type: 'text', text: 'it' }] },
      { type: 'text', text: ' and ' },
      { type: 'code', text: 'x()' },
      { type: 'text', text: ' see ' },
      { type: 'link', text: 'docs', url: 'https://developer.mozilla.org/' },
    ]);
  });

  it('keeps snake_case names intact', () => {
    expect(parseInline('use user_id and max_length')).toEqual([
      { type: 'text', text: 'use user_id and max_length' },
    ]);
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://example.com',
    'file:///etc/passwd',
    'intent://scan/#Intent;scheme=zxing;end',
    'https://user:pass@example.com',
    '//example.com',
    'https://exa mple.com',
  ])('never turns an unsafe URL into a link: %s', (url) => {
    const nodes = parseInline(`[click](${url})`);
    expect(nodes.some((node) => node.type === 'link')).toBe(false);
    expect(nodes[0]).toEqual({ type: 'text', text: 'click' });
  });

  it('leaves unmatched markers as text', () => {
    expect(parseInline('a ** b * c ` d [e](')).toEqual([
      { type: 'text', text: 'a ** b * c ` d [e](' },
    ]);
  });
});

describe('isSafeUrl', () => {
  it('accepts only https URLs on a host', () => {
    expect(isSafeUrl('https://react.dev/learn')).toBe(true);
    expect(isSafeUrl('https://')).toBe(false);
    expect(isSafeUrl(`https://a.com/${'x'.repeat(3000)}`)).toBe(false);
  });
});

describe('robustness', () => {
  const ALPHABET = [
    '*',
    '_',
    '`',
    '[',
    ']',
    '(',
    ')',
    '#',
    '-',
    '1.',
    '\n',
    ' ',
    'a',
    '```',
    '>',
    'https://x.io',
  ];

  function randomText(seed: number, length: number): string {
    let state = seed;
    let out = '';
    for (let i = 0; i < length; i += 1) {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      out += ALPHABET[state % ALPHABET.length];
    }
    return out;
  }

  it('never throws on random input', () => {
    for (let seed = 1; seed <= 2_000; seed += 1) {
      expect(() => parseMarkdown(randomText(seed, 200))).not.toThrow();
    }
  });

  it('stays fast on hostile input', () => {
    const hostile = [
      '*'.repeat(5_000),
      '_a'.repeat(2_500),
      '['.repeat(3_000) + '](',
      '`'.repeat(4_999),
      '**'.repeat(2_000) + 'x',
      `${'- item\n'.repeat(3_000)}`,
      'a'.repeat(40_000),
    ];
    const started = Date.now();
    for (const text of hostile) parseMarkdown(text);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
