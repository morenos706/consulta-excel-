const TOKEN_KEY = 's360_token';
const EMAIL_KEY = 's360_email';

export const session = {
  save(token: string, email: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
  },
  token() {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  },
  email() {
    return typeof window !== 'undefined' ? localStorage.getItem(EMAIL_KEY) : null;
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  },
};
