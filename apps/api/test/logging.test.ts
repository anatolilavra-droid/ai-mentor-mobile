import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildTestApp } from './helpers/testApp.js';
import { bearer, signToken, USER_A } from './helpers/tokens.js';

describe('logging', () => {
  it('never logs the token or the chat message', async () => {
    const { app, logs } = buildTestApp();
    const token = await signToken();
    const secretMessage = 'MY-PRIVATE-QUESTION-12345';

    const res = await request(app)
      .post('/api/ai/chat?debug=1')
      .set('Authorization', bearer(token))
      .set('Cookie', 'session=cookie-value-123')
      .send({ message: secretMessage });

    const text = logs.text();
    expect(res.status).toBe(400); // the query string is rejected, the request is still logged
    expect(text).not.toContain(token);
    expect(text).not.toContain(token.split('.')[2]);
    expect(text).not.toContain(secretMessage);
    expect(text).not.toContain('cookie-value-123');
    expect(text).not.toContain('debug=1');
  });

  it('logs one structured line per request with id, status, duration and user', async () => {
    const { app, logs } = buildTestApp();
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', bearer(await signToken()))
      .send({ message: 'Hi' });

    const entries = logs.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const completed = entries.find((entry) => entry.msg === 'request completed');
    expect(completed).toMatchObject({
      requestId: res.headers['x-request-id'],
      userId: USER_A,
      req: { method: 'POST', path: '/api/ai/chat' },
      res: { statusCode: 200 },
    });
    expect(typeof completed?.durationMs).toBe('number');

    const aiEntry = entries.find((entry) => entry.msg === 'ai call completed');
    expect(aiEntry).toMatchObject({
      requestId: res.headers['x-request-id'],
      ai: { promptRef: 'chat/v1', provider: 'mock', model: 'mock-mentor-1' },
    });
    expect(JSON.stringify(aiEntry)).not.toContain('Hi"');
  });
});
