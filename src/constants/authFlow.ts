import { BETA_INVITE_SESSION_KEY } from '../services/betaAccessService';

export const LOGIN_INTENT_SESSION_KEY = 'linkzip_login_intent';

// App unmounts the router (and therefore Landing) while it bootstraps auth, so
// a sign-in failure raised during that window has nowhere to render: the event
// reaches no listener and setState on the unmounted page is dropped. Failure
// sites park a ready-to-render message here instead of relying on either, and
// Landing replays whatever survived once it mounts again.
export const AUTH_ERROR_SESSION_KEY = 'linkzip_auth_error';

export type ParkedAuthError = { kind: 'account-not-found' | 'error'; detail?: string };

export const parkAuthError = (value: ParkedAuthError, { keepExisting = false } = {}) => {
  try {
    if (keepExisting && sessionStorage.getItem(AUTH_ERROR_SESSION_KEY)) return;
    sessionStorage.setItem(AUTH_ERROR_SESSION_KEY, JSON.stringify(value));
  } catch {
    // Private mode can reject sessionStorage writes; the live event path still applies.
  }
};

export const takeParkedAuthError = (): ParkedAuthError | null => {
  try {
    const raw = sessionStorage.getItem(AUTH_ERROR_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(AUTH_ERROR_SESSION_KEY);
    const parsed = JSON.parse(raw) as ParkedAuthError;
    return parsed?.kind === 'account-not-found' || parsed?.kind === 'error' ? parsed : null;
  } catch {
    return null;
  }
};

export const clearParkedAuthError = () => {
  try {
    sessionStorage.removeItem(AUTH_ERROR_SESSION_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
};

// Only the OAuth completion screens call this, so every return is an auth
// return: falling back to the marketing root would strand a user who just
// signed in. /login re-resolves the account and forwards to the workspace.
export const authFlowReturnPath = () => {
  if (sessionStorage.getItem(BETA_INVITE_SESSION_KEY)) return '/signup';
  return '/login';
};
