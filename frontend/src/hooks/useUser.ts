import { useState, useEffect } from 'react';
import { apiCall, getToken } from '../utils/api';

export function useUser() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('jansetu_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const fetchUser = async () => {
    if (!getToken()) return;
    try {
      const data = await apiCall('GET', '/api/v1/auth/me');
      if (data && !data.error && data.status !== 'authenticated') {
        const u = { 
          name: data.name || '', 
          role: data.role || '', 
          user_id: data.user_id || '', 
          phone: data.phone || '', 
          email: data.email || '' 
        };
        setUser(u);
        localStorage.setItem('jansetu_user', JSON.stringify(u));
      }
    } catch (err) {
      console.error('Failed to fetch fresh user:', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, fetchUser };
}
