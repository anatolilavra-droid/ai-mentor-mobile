import { getGreetingKey } from '@/hooks/useGreeting';

const at = (hour: number) => new Date(2026, 0, 1, hour, 0, 0);

describe('getGreetingKey', () => {
  it.each([
    [6, 'home.greeting.morning'],
    [11, 'home.greeting.morning'],
    [12, 'home.greeting.afternoon'],
    [17, 'home.greeting.afternoon'],
    [18, 'home.greeting.evening'],
    [22, 'home.greeting.evening'],
    [23, 'home.greeting.night'],
    [3, 'home.greeting.night'],
  ])('at %i:00 returns %s', (hour, expected) => {
    expect(getGreetingKey(at(hour))).toBe(expected);
  });
});
