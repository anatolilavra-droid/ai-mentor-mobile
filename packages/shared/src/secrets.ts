/**
 * A rough, local check for things that look like secrets in pasted code, so the
 * app can warn before the code leaves the device. It is a heuristic: it can miss
 * real secrets and flag harmless text. It reports only the kind and the line,
 * never the matched value, so nothing secret ends up in UI text or logs.
 */

export const SECRET_KINDS = [
  'private_key',
  'api_key',
  'access_token',
  'jwt',
  'credential_assignment',
  'connection_string',
] as const;
export type SecretKind = (typeof SECRET_KINDS)[number];

export type SecretFinding = { kind: SecretKind; line: number };

type Rule = {
  kind: SecretKind;
  pattern: RegExp;
  /** The part that must not be a placeholder (a capture group), when it can be one. */
  valueGroup?: number;
  /** Extra check on the match (for example, the variable name). */
  accept?: (match: RegExpMatchArray) => boolean;
};

/** Variable or key names that usually hold a secret (compared without `_` and `-`). */
const SECRET_NAME_ENDINGS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'secretkey',
  'clientsecret',
  'apikey',
  'accesskey',
  'privatekey',
  'token',
];

function isSecretName(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[_-]/g, '');
  return SECRET_NAME_ENDINGS.some((ending) => normalized.endsWith(ending));
}

const PLACEHOLDER_WORDS =
  /example|placeholder|changeme|change_me|dummy|sample|redacted|replace|xxxx|todo|your[_\- ]/i;

/** Values that are clearly not real secrets: masks, templates, env lookups, sentences. */
function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    /\s/.test(trimmed) ||
    /^([x*._-])\1*$/i.test(trimmed) ||
    /^<.*>$/.test(trimmed) ||
    /^\$\{.*\}$/.test(trimmed) ||
    /^\{\{.*\}\}$/.test(trimmed) ||
    /^(process\.env|os\.environ|import\.meta\.env)/.test(trimmed) ||
    PLACEHOLDER_WORDS.test(trimmed)
  );
}

const RULES: readonly Rule[] = [
  { kind: 'private_key', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----/g },

  { kind: 'api_key', pattern: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g },
  { kind: 'api_key', pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g },
  { kind: 'api_key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { kind: 'api_key', pattern: /\bsb_secret_[A-Za-z0-9_-]{10,}/g },
  { kind: 'api_key', pattern: /\b(?:sk|rk)_live_[0-9A-Za-z]{10,}/g },

  { kind: 'access_token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { kind: 'access_token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/g },
  { kind: 'access_token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { kind: 'access_token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },

  { kind: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },

  {
    kind: 'connection_string',
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s:/@]+:([^\s@/]+)@/gi,
    valueGroup: 1,
  },

  {
    // password = "...", apiKey: '...', "client_secret": "..." (8+ characters, no spaces)
    kind: 'credential_assignment',
    pattern: /(["']?)([A-Za-z_][\w-]*)\1\s*[:=]\s*(["'`])([^"'`\n]{8,})\3/g,
    valueGroup: 4,
    accept: (match) => isSecretName(match[2] ?? ''),
  },
];

/**
 * Lines (1-based) with something that may be a secret, at most one finding per
 * kind and line, sorted by line. Values are never returned.
 */
export function findPossibleSecrets(code: string): SecretFinding[] {
  const findings = new Map<string, SecretFinding>();
  const lines = code.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((text, index) => {
    for (const rule of RULES) {
      for (const match of text.matchAll(rule.pattern)) {
        if (rule.accept && !rule.accept(match)) continue;
        if (rule.valueGroup !== undefined && isPlaceholder(match[rule.valueGroup] ?? '')) continue;
        const line = index + 1;
        findings.set(`${line}:${rule.kind}`, { kind: rule.kind, line });
      }
    }
  });

  return [...findings.values()].sort((a, b) => a.line - b.line);
}
