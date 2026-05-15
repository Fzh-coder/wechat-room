import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import api from '../utils/api';
import { generateAvatar } from '../utils/helpers';

interface User {
  username: string;
  avatar: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, avatar?: string) => Promise<void>;
  logout: () => void;
  updateAvatar: (newAvatar: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateAvatar: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时从 localStorage 恢复登录状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username && parsed.token) {
          setUser(parsed);
        }
      }
    } catch (e) {
      // 解析失败则清除
      localStorage.removeItem('chat_user');
    }
    setLoading(false);
  }, []);

  // 持久化 user 到 localStorage
  const persistUser = useCallback((userData: User) => {
    localStorage.setItem('chat_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // 登录
  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token } = res.data;

    // 获取用户列表以找到当前用户的头像
    let avatar = generateAvatar(username);
    try {
      const usersRes = await api.get('/users/all');
      const current = usersRes.data.find((u: any) => u.username === username);
      if (current?.avatar) {
        avatar = current.avatar;
      }
    } catch {
      // 使用默认头像
    }

    persistUser({ username, avatar, token: access_token });
  }, [persistUser]);

  // 注册
  const register = useCallback(async (username: string, password: string, avatar?: string) => {
    const av = avatar || generateAvatar(username);
    const res = await api.post('/users/register', { username, password, avatar: av });
    // 注册成功后自动登录，但后端可能不返回 token，手动调用登录
    const loginRes = await api.post('/auth/login', { username, password });
    const { access_token } = loginRes.data;
    persistUser({ username, avatar: res.data.avatar || av, token: access_token });
  }, [persistUser]);

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem('chat_user');
    setUser(null);
  }, []);

  // 更新头像
  const updateAvatar = useCallback((newAvatar: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, avatar: newAvatar };
      localStorage.setItem('chat_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
