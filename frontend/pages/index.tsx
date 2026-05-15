import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

// 头像颜色选项（注册时选择）
const AVATAR_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
  '#fa709a', '#a18cd1', '#fbc2eb', '#84fab0', '#8fd3f4',
];

export default function AuthPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, loading } = useAuth();

  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[1]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 已登录则跳转到聊天页
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/chat');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <div className="auth-loading">加载中...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    try {
      if (isLoginView) {
        await login(username.trim(), password);
      } else {
        // 注册：生成基于颜色和用户名的 SVG 头像
        const firstChar = username.trim().charAt(0).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
          <rect width="120" height="120" fill="${selectedColor}" rx="16"/>
          <text x="60" y="60" text-anchor="middle" dominant-baseline="central" fill="white" font-size="48" font-family="Arial,sans-serif" font-weight="bold">${firstChar}</text>
        </svg>`;
        const avatarDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        await register(username.trim(), password, avatarDataUrl);
      }
      router.push('/chat');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '操作失败，请重试';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="all">
      <div className="container">
        {/* 登录面板 */}
        {isLoginView && (
          <div id="login-container">
            <div className="auth-box">
              <div className="auth-header">
                <div className="auth-logo">
                  <span className="auth-logo-text">💬</span>
                </div>
                <h1 className="title">欢迎回来</h1>
                <p className="subtitle">登录你的账号继续聊天</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="submit" className="auth-btn" disabled={submitting}>
                  {submitting ? '登录中...' : '登 录'}
                </button>
              </form>
              <p className="toggle-text">
                还没有账号？
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLoginView(false);
                    setError('');
                  }}
                >
                  立即注册
                </a>
              </p>
            </div>
          </div>
        )}

        {/* 注册面板 */}
        {!isLoginView && (
          <div id="register-container">
            <div className="auth-box">
              <div className="auth-header">
                <div className="auth-logo">
                  <span className="auth-logo-text">✨</span>
                </div>
                <h1 className="title">创建账号</h1>
                <p className="subtitle">注册一个新账号加入聊天</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    placeholder="请设置密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="avatar-section">
                  <div className="avatar-label">
                    <span>选择头像颜色</span>
                  </div>
                  <ul className="avatars reg-avatars">
                    {AVATAR_COLORS.map((color, idx) => (
                      <li
                        key={idx}
                        className={selectedColor === color ? 'active' : ''}
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color, width: 48, height: 48, borderRadius: 10, cursor: 'pointer', border: selectedColor === color ? '3px solid #333' : '3px solid transparent' }}
                      />
                    ))}
                  </ul>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="submit" className="auth-btn" disabled={submitting}>
                  {submitting ? '注册中...' : '注 册'}
                </button>
              </form>
              <p className="toggle-text">
                已有账号？
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsLoginView(true);
                    setError('');
                  }}
                >
                  去登录
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
