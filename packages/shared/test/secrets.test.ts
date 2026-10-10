import { describe, expect, it } from 'vitest';

import { findPossibleSecrets } from '../src/index.js';

/*
 * Fake secrets are assembled at runtime, so the repository never contains a
 * string that looks like a real key (and secret scanners stay quiet).
 */
const fake = {
  google: 'AI' + 'za' + 'Sy' + 'D'.repeat(33),
  openai: 'sk' + '-proj-' + 'q7W'.repeat(8),
  aws: 'AK' + 'IA' + 'QWERTYUIOPASDFGH',
  supabase: 'sb' + '_secret_' + 'k3y'.repeat(5),
  stripe: 'sk' + '_live_' + 'Ab9'.repeat(5),
  github: 'gh' + 'p_' + 'Zx8'.repeat(12),
  githubPat: 'github' + '_pat_' + 'Q1w'.repeat(8),
  gitlab: 'gl' + 'pat-' + 'R2t'.repeat(8),
  slack: 'xo' + 'xb-' + '1234-5678-abcd',
  jwt: 'ey' + 'J' + 'hbGciOiJIUzI1' + '.ey' + 'J' + 'zdWIiOiIxMjM0' + '.' + 'S1gN4tuRe_x9',
  privateKey: '-----BEGIN ' + 'RSA PRIVATE KEY-----',
};

const kindsOf = (code: string) => findPossibleSecrets(code).map((finding) => finding.kind);

describe('findPossibleSecrets', () => {
  it('finds API keys and tokens', () => {
    for (const value of [fake.google, fake.openai, fake.aws, fake.supabase, fake.stripe]) {
      expect(kindsOf(`const key = ${value};`)).toContain('api_key');
    }
    for (const value of [fake.github, fake.githubPat, fake.gitlab, fake.slack]) {
      expect(kindsOf(`token(${value})`)).toContain('access_token');
    }
    expect(kindsOf(`auth(${fake.jwt})`)).toContain('jwt');
  });

  it('finds private key headers', () => {
    expect(kindsOf(`${fake.privateKey}\nMIIEow...`)).toEqual(['private_key']);
    expect(kindsOf('-----BEGIN ' + 'OPENSSH PRIVATE KEY-----')).toEqual(['private_key']);
  });

  it('finds password and secret assignments in several languages', () => {
    expect(kindsOf('password = "s3cr3tPass!"')).toEqual(['credential_assignment']);
    expect(kindsOf("const apiKey: string = 'a1b2c3d4e5f6';")).toEqual([]);
    expect(kindsOf("const apiKey = 'a1b2c3d4e5f6';")).toEqual(['credential_assignment']);
    expect(kindsOf('{ "client_secret": "q1w2e3r4t5y6" }')).toEqual(['credential_assignment']);
    expect(kindsOf('DB_PASSWORD="hunter2hunter2"')).toEqual(['credential_assignment']);
  });

  it('finds credentials in connection strings', () => {
    expect(kindsOf('url = "postgres://admin:Sup3rPass@db.local:5432/app"')).toContain(
      'connection_string',
    );
    expect(kindsOf('mongodb+srv://user:p4ssw0rd@cluster0.mongodb.net')).toContain(
      'connection_string',
    );
  });

  it('ignores placeholders, env lookups, sentences and ordinary code', () => {
    expect(kindsOf('password = "********"')).toEqual([]);
    expect(kindsOf('api_key = "your_api_key_here"')).toEqual([]);
    expect(kindsOf('token = "<YOUR_TOKEN>"')).toEqual([]);
    expect(kindsOf('secret = "${SECRET_VALUE}"')).toEqual([]);
    expect(kindsOf('password: "Password is too short"')).toEqual([]);
    expect(kindsOf('const apiKey = process.env.API_KEY;')).toEqual([]);
    expect(kindsOf('postgres://user:${PASSWORD}@localhost/db')).toEqual([]);
    const ordinary = [
      'function add(a, b) {',
      '  const message = "Hello, world";',
      '  return a + b;',
      '}',
      'def greet(name):',
      '    return f"Hi {name}"',
      '{ "name": "app", "version": "1.0.0" }',
    ].join('\n');
    expect(findPossibleSecrets(ordinary)).toEqual([]);
  });

  it('reports 1-based lines, one finding per kind and line, sorted', () => {
    const code = [
      'const a = 1;',
      `const apiKey = "${fake.google}"; // ${fake.google}`,
      '',
      fake.jwt,
    ].join('\r\n');
    expect(findPossibleSecrets(code)).toEqual([
      { kind: 'api_key', line: 2 },
      { kind: 'credential_assignment', line: 2 },
      { kind: 'jwt', line: 4 },
    ]);
  });

  it('never returns the matched value', () => {
    const code = [fake.google, `password = "${'Zq9'.repeat(4)}"`, fake.privateKey].join('\n');
    const serialized = JSON.stringify(findPossibleSecrets(code));
    expect(serialized).not.toContain(fake.google.slice(4, 14));
    expect(serialized).not.toContain('Zq9');
    expect(serialized).not.toContain('RSA');
    expect(Object.keys(findPossibleSecrets(code)[0] ?? {}).sort()).toEqual(['kind', 'line']);
  });
});
