const AUTH_KEY = "karangampel-auth";

function readStoredAuth() {
  for (const storage of [window.sessionStorage, window.localStorage]) {
    const stored = storage.getItem(AUTH_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        storage.removeItem(AUTH_KEY);
      }
    }
  }
  return null;
}

export function getAccessToken() {
  return readStoredAuth()?.access_token ?? null;
}

export function getCurrentUser() {
  return readStoredAuth()?.user ?? null;
}

export function saveAuth(auth, rememberMe = false) {
  clearAuth();
  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  window.sessionStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(AUTH_KEY);
}
