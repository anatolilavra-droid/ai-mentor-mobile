import { useMemo } from 'react';

export type GreetingKey =
  | 'home.greeting.morning'
  | 'home.greeting.afternoon'
  | 'home.greeting.evening'
  | 'home.greeting.night';

export function getGreetingKey(date: Date): GreetingKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon';
  if (hour >= 18 && hour < 23) return 'home.greeting.evening';
  return 'home.greeting.night';
}

export function useGreeting(): GreetingKey {
  return useMemo(() => getGreetingKey(new Date()), []);
}
