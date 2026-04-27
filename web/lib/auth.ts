export const isLoggedIn = () =>
  typeof window !== 'undefined' && !!localStorage.getItem('clasr_token');

export const saveSession = (access_token: string, refresh_token: string) => {
  localStorage.setItem('clasr_token', access_token);
  localStorage.setItem('clasr_refresh', refresh_token);
};

export const logout = () => {
  localStorage.removeItem('clasr_token');
  localStorage.removeItem('clasr_refresh');
  window.location.href = '/login';
};
