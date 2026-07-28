export type OnboardingUserType = 'creator' | 'brand' | 'personal';

export interface OnboardingSurvey {
  userType: OnboardingUserType;
  goals: string[];
  categories: string[];
  layoutPreset?: 'simple-list' | 'spotlight' | 'showcase' | 'storefront';
  completedAt?: string;
}

export const ONBOARDING_SURVEY_STORAGE_KEY = 'linkzip_onboarding_survey';

export const readOnboardingSurvey = (): OnboardingSurvey | null => {
  try {
    const raw = localStorage.getItem(ONBOARDING_SURVEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) as OnboardingSurvey : null;
  } catch {
    return null;
  }
};

export const writeOnboardingSurvey = (survey: OnboardingSurvey) => {
  localStorage.setItem(ONBOARDING_SURVEY_STORAGE_KEY, JSON.stringify(survey));
};

export const clearOnboardingSurvey = () => {
  localStorage.removeItem(ONBOARDING_SURVEY_STORAGE_KEY);
};
