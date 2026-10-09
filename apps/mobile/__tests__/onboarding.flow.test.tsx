import { Alert } from 'react-native';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { readDraft } from '@/stores/onboardingDraft.store';

import {
  USER_ID,
  completeProfile,
  completeTechnologies,
  newProfile,
  phase2Profile,
  testSession,
} from './fixtures';

/**
 * Integration tests of the onboarding flow: real routes and guards,
 * Supabase replaced by the in-memory fake.
 */
type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const fake = jest.requireMock('@/lib/supabase/client') as FakeSupabase;

const TIMEOUT = { timeout: 10000 };
jest.setTimeout(40000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const continueButton = () => screen.getByTestId('onboarding-continue');

async function startAsNewUser() {
  fake.fakeDb.session = testSession;
  fake.fakeDb.profile = { ...newProfile };
  const router = renderRouter('./app', { initialUrl: '/' });
  expect(await screen.findByTestId('onboarding-welcome', {}, TIMEOUT)).toBeOnTheScreen();
  return router;
}

async function answerUntilTechnologies() {
  press('onboarding-start');
  await screen.findByTestId('onboarding-name');
  expect(continueButton()).toBeDisabled();
  fireEvent.changeText(screen.getByTestId('onboarding-name-input'), 'Anatoliy');
  press('onboarding-continue');

  await screen.findByTestId('onboarding-experience');
  press('onboarding-level-junior');
  press('onboarding-continue');

  await screen.findByTestId('onboarding-goal');
  expect(continueButton()).toBeDisabled();
  press('onboarding-goal-option-learn_react');
  fireEvent.changeText(screen.getByTestId('onboarding-goal-details'), 'Ship my portfolio');
  press('onboarding-continue');

  await screen.findByTestId('onboarding-time');
  press('onboarding-minutes-preset-30');
  press('onboarding-continue');

  await screen.findByTestId('onboarding-technologies');
  await screen.findByTestId('technology-react');
}

describe('onboarding flow', () => {
  it('walks a new user through every step and saves everything at once', async () => {
    const router = await startAsNewUser();
    await answerUntilTechnologies();

    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Pick at least one technology to continue.')).toBeOnTheScreen();
    press('technology-react');
    press('technology-typescript');
    expect(screen.getByTestId('technologies-counter')).toHaveTextContent('2 of 8 selected');
    press('onboarding-continue');

    await screen.findByTestId('onboarding-language');
    press('onboarding-language-option-de');
    press('onboarding-continue');

    await screen.findByTestId('onboarding-summary');
    expect(screen.getByTestId('summary-row-goal')).toHaveTextContent(/Learn React/);
    expect(screen.getByTestId('summary-row-technologies')).toHaveTextContent(/React/);
    expect(screen.getByTestId('summary-row-technologies')).toHaveTextContent(/TypeScript/);

    press('onboarding-save');
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
    expect(fake.supabase.rpc).toHaveBeenCalledWith('complete_onboarding', {
      p_display_name: 'Anatoliy',
      p_experience_level: 'junior',
      p_primary_goal: 'learn_react',
      p_custom_goal_details: 'Ship my portfolio',
      p_daily_minutes: 30,
      p_ui_language: 'de',
      p_technologies: ['react', 'typescript'],
    });
    expect(fake.fakeDb.profile?.onboarding_completed).toBe(true);
    expect(readDraft(USER_ID, 'onboarding')).toBeNull();
    // The saved interface language is applied right away.
    expect(await screen.findByText('Weiterlernen')).toBeOnTheScreen();
  });

  it('disables the other technologies after 8 and explains why', async () => {
    await startAsNewUser();
    await answerUntilTechnologies();

    for (const id of [
      'javascript',
      'typescript',
      'python',
      'html',
      'css',
      'sql',
      'react',
      'nodejs',
    ]) {
      press(`technology-${id}`);
    }
    expect(screen.getByTestId('technology-git')).toBeDisabled();
    expect(screen.getByText('You can pick up to 8. Remove one to add another.')).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('saves the draft after each step and resumes there after a restart', async () => {
    const first = await startAsNewUser();
    await answerUntilTechnologies();
    expect(readDraft(USER_ID, 'onboarding')).toMatchObject({
      currentStep: 'technologies',
      values: { display_name: 'Anatoliy', primary_goal: 'learn_react', daily_minutes: '30' },
    });

    // Simulate closing the app: unmount everything and start again.
    first.unmount();
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByTestId('onboarding-technologies', {}, TIMEOUT)).toBeOnTheScreen();
    press('onboarding-back');
    await screen.findByTestId('onboarding-time');
    expect(screen.getByTestId('onboarding-minutes-input')).toHaveDisplayValue('30');
  });

  it('keeps the draft and offers Retry when Supabase fails, then saves', async () => {
    await startAsNewUser();
    await answerUntilTechnologies();
    press('technology-react');
    press('onboarding-continue');
    await screen.findByTestId('onboarding-language');
    press('onboarding-continue');
    await screen.findByTestId('onboarding-summary');

    fake.fakeDb.rpcError = { message: 'TypeError: Network request failed' };
    press('onboarding-save');
    expect(await screen.findByTestId('onboarding-save-error')).toHaveTextContent(/No connection/);
    expect(screen.getByTestId('onboarding-save')).toHaveTextContent('Retry');
    expect(readDraft(USER_ID, 'onboarding')).not.toBeNull();
    expect(fake.fakeDb.profile?.onboarding_completed).toBe(false);

    fake.fakeDb.rpcError = null;
    press('onboarding-save');
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();
    expect(readDraft(USER_ID, 'onboarding')).toBeNull();
  });

  it('lets the user skip, then finish from Home', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    await startAsNewUser();
    press('onboarding-welcome-skip');

    expect(await screen.findByTestId('finish-setup-card', {}, TIMEOUT)).toBeOnTheScreen();
    expect(fake.fakeDb.profile?.onboarding_skipped_at).not.toBeNull();

    press('finish-setup-action');
    expect(await screen.findByTestId('onboarding-welcome', {}, TIMEOUT)).toBeOnTheScreen();
    alert.mockRestore();
  });

  it('opens a Phase 2 account at the first missing step', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...phase2Profile };
    renderRouter('./app', { initialUrl: '/' });
    await screen.findByTestId('onboarding-welcome', {}, TIMEOUT);
    press('onboarding-start');
    expect(await screen.findByTestId('onboarding-goal')).toBeOnTheScreen();
  });
});

describe('personalize your mentor', () => {
  it('reopens onboarding with current answers and saves level, goal and technologies', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...completeProfile };
    fake.fakeDb.userTechnologies = [...completeTechnologies];
    const router = renderRouter('./app', { initialUrl: '/profile' });

    expect(await screen.findByTestId('personalization-section', {}, TIMEOUT)).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByTestId('personalization-section')).toHaveTextContent(/TypeScript/),
    );
    press('personalize-mentor');

    expect(await screen.findByTestId('onboarding-experience', {}, TIMEOUT)).toBeOnTheScreen();
    expect(screen.getByTestId('onboarding-level-junior')).toBeChecked();
    expect(screen.getByText('Step 1 of 3')).toBeOnTheScreen();
    press('onboarding-level-middle');
    press('onboarding-continue');

    await screen.findByTestId('onboarding-goal');
    expect(screen.getByTestId('onboarding-goal-option-learn_react')).toBeChecked();
    press('onboarding-goal-option-prepare_for_job');
    press('onboarding-continue');

    await screen.findByTestId('onboarding-technologies');
    await screen.findByTestId('technology-react');
    expect(screen.getByTestId('technology-react')).toBeChecked();
    press('technology-nodejs');
    press('onboarding-continue');

    await screen.findByTestId('onboarding-summary');
    expect(screen.queryByTestId('summary-row-name')).toBeNull();
    press('onboarding-save');

    await waitFor(() => expect(router.getPathname()).toBe('/profile'), TIMEOUT);
    expect(fake.supabase.rpc).toHaveBeenCalledWith('save_personalization', {
      p_experience_level: 'middle',
      p_primary_goal: 'prepare_for_job',
      p_custom_goal_details: 'Build my first React Native app',
      p_technologies: ['react', 'typescript', 'nodejs'],
    });
    expect(fake.fakeDb.profile?.onboarding_completed).toBe(true);
  });

  it('shows only name, minutes and language in Edit profile', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...completeProfile };
    renderRouter('./app', { initialUrl: '/profile-edit' });
    expect(await screen.findByTestId('edit-profile-screen', {}, TIMEOUT)).toBeOnTheScreen();
    expect(screen.getByTestId('profile-display-name')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-minutes-input')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-language')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-level')).toBeNull();
    expect(screen.queryByTestId('profile-goal')).toBeNull();
  });
});
