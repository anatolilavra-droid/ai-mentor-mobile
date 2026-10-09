import { parseApiBaseUrl } from '@/lib/api/config';

describe('parseApiBaseUrl', () => {
  it.each([
    ['https://ai-mentor-api.onrender.com', 'https://ai-mentor-api.onrender.com'],
    ['https://ai-mentor-api.onrender.com/', 'https://ai-mentor-api.onrender.com'],
    ['  https://api.example.com  ', 'https://api.example.com'],
    ['http://localhost:3000', 'http://localhost:3000'],
    ['http://10.0.2.2:3000', 'http://10.0.2.2:3000'],
  ])('accepts %s', (raw, expected) => {
    expect(parseApiBaseUrl(raw)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    'http://api.example.com',
    'ftp://x.com',
    'not a url',
    'https://u:p@x.com',
    'https://x.com?a=1',
  ])('rejects %s', (raw) => {
    expect(parseApiBaseUrl(raw)).toBeNull();
  });
});
