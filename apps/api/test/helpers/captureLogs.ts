import type { DestinationStream } from 'pino';

/** Collects log lines in memory so tests can assert on what was (not) logged. */
export function captureLogs() {
  const lines: string[] = [];
  const destination: DestinationStream = { write: (line: string) => void lines.push(line) };
  return { destination, lines, text: () => lines.join('') };
}
