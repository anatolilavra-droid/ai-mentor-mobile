import AsyncStorage from '@react-native-async-storage/async-storage';

import { readDraft, useOnboardingDraftStore } from '@/stores/onboardingDraft.store';

const USER = 'user-1';

describe('onboarding draft store', () => {
  beforeEach(() => {
    useOnboardingDraftStore.getState().clearAll();
  });

  it('saves the current step and answers on the device', async () => {
    useOnboardingDraftStore.getState().saveDraft({
      userId: USER,
      mode: 'onboarding',
      currentStep: 'goal',
      values: { display_name: 'Anatoliy', experience_level: 'junior' },
    });

    expect(readDraft(USER, 'onboarding')).toMatchObject({
      currentStep: 'goal',
      values: { display_name: 'Anatoliy', experience_level: 'junior' },
    });
    const stored = await AsyncStorage.getItem('onboarding-drafts');
    expect(stored).toContain('"currentStep":"goal"');
  });

  it('restores drafts after a restart (rehydration from storage)', async () => {
    useOnboardingDraftStore.getState().saveDraft({
      userId: USER,
      mode: 'onboarding',
      currentStep: 'technologies',
      values: { technologies: ['react'] },
    });
    const stored = await AsyncStorage.getItem('onboarding-drafts');
    useOnboardingDraftStore.setState({ drafts: {} });
    expect(readDraft(USER, 'onboarding')).toBeNull();

    await AsyncStorage.setItem('onboarding-drafts', stored as string);
    await useOnboardingDraftStore.persist.rehydrate();
    expect(readDraft(USER, 'onboarding')?.currentStep).toBe('technologies');
  });

  it('keeps drafts separate per user and mode, and clears one', () => {
    const { saveDraft, clearDraft } = useOnboardingDraftStore.getState();
    saveDraft({ userId: USER, mode: 'onboarding', currentStep: 'name', values: {} });
    saveDraft({ userId: USER, mode: 'personalize', currentStep: 'goal', values: {} });
    saveDraft({ userId: 'user-2', mode: 'onboarding', currentStep: 'time', values: {} });

    clearDraft(USER, 'onboarding');
    expect(readDraft(USER, 'onboarding')).toBeNull();
    expect(readDraft(USER, 'personalize')?.currentStep).toBe('goal');
    expect(readDraft('user-2', 'onboarding')?.currentStep).toBe('time');
  });

  it('ignores a corrupted draft', () => {
    useOnboardingDraftStore.setState({
      drafts: { [`${USER}:onboarding`]: { version: 1, userId: USER } as never },
    });
    expect(readDraft(USER, 'onboarding')).toBeNull();
  });
});
