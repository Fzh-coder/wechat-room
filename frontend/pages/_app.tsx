import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import '../styles/chat.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      {/* 注入全局样式和基础 body 背景 */}
      <div className="app-container">
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}
