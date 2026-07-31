import { BETA_INVITE_SESSION_KEY } from '../services/betaAccessService';

export const LOGIN_INTENT_SESSION_KEY = 'linkzip_login_intent';

export const authFlowReturnPath = () => {
  if (sessionStorage.getItem(LOGIN_INTENT_SESSION_KEY) === '1') return '/login';
  if (sessionStorage.getItem(BETA_INVITE_SESSION_KEY)) return '/signup';
  return '/';
};
