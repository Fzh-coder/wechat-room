import dynamic from 'next/dynamic';

// 使用动态导入加载聊天主页面，ssr: false 避免服务端渲染时 window 未定义错误
const ChatPage = dynamic(() => import('../components/ChatPage'), {
  ssr: false,
  loading: () => (
    <div className="all">
      <div className="container">
        <div className="auth-box" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666', fontSize: '16px' }}>加载聊天页面中...</p>
        </div>
      </div>
    </div>
  ),
});

export default function Chat() {
  return <ChatPage />;
}
