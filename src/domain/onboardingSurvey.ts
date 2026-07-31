export type OnboardingUserType = 'creator' | 'brand' | 'personal';

export interface OnboardingSurvey {
  userType: OnboardingUserType;
  goals: string[];
  categories: string[];
  layoutPreset?: 'simple-list' | 'spotlight' | 'showcase' | 'storefront';
  completedAt?: string;
}

export const ONBOARDING_SURVEY_STORAGE_KEY = 'linkzip_onboarding_survey';

export const getOnboardingSurveyStorageKey = (uid: string) => `${ONBOARDING_SURVEY_STORAGE_KEY}:${uid}`;

export const readOnboardingSurvey = (uid?: string | null): OnboardingSurvey | null => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(getOnboardingSurveyStorageKey(uid));
    return raw ? JSON.parse(raw) as OnboardingSurvey : null;
  } catch {
    return null;
  }
};

export const writeOnboardingSurvey = (uid: string | null | undefined, survey: OnboardingSurvey) => {
  if (!uid) return;
  localStorage.setItem(getOnboardingSurveyStorageKey(uid), JSON.stringify(survey));
};

export const clearOnboardingSurvey = (uid?: string | null) => {
  if (uid) localStorage.removeItem(getOnboardingSurveyStorageKey(uid));
  // Remove the old shared draft so it can never leak into another account.
  localStorage.removeItem(ONBOARDING_SURVEY_STORAGE_KEY);
};

export const isOnboardingComplete = (data?: Record<string, any> | null) => {
  if (!data) return false;
  if (data.onboardingCompleted === true) return true;
  // Existing accounts created before the completion flag are treated as complete.
  return Boolean(data.profile?.username || data.username);
};
