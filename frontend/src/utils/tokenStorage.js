const KEY = 'sems_token';

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getToken() {
  return safe(() => sessionStorage.getItem(KEY) || localStorage.getItem(KEY));
}

export function setToken(token, remember = true) {
  clearToken();
  safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, token));
}

export function clearToken() {
  safe(() => localStorage.removeItem(KEY));
  safe(() => sessionStorage.removeItem(KEY));
}

export function replaceToken(token) {
  const persistent = safe(() => localStorage.getItem(KEY) !== null, false);
  setToken(token, persistent);
}
