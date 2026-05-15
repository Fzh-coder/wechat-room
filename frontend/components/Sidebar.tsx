import { escapeHtml } from '../utils/helpers';

interface Conversation {
  type: 'private' | 'group';
  target: string;
  name: string;
  avatar?: string;
  unread: number;
  groupData?: any;
}

interface SidebarProps {
  user: { username: string; avatar: string } | null;
  conversations: Conversation[];
  activeConv: { type: string; target: string } | null;
  searchFilter: string;
  onSearchChange: (val: string) => void;
  onSelectConversation: (type: string, target: string) => void;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  conversations,
  activeConv,
  searchFilter,
  onSearchChange,
  onSelectConversation,
  onLogout,
}: SidebarProps) {
  return (
    <div className="chat-sidebar">
      {/* 用户信息 */}
      <div className="sidebar-profile">
        <img src={user?.avatar || ''} alt="" className="sidebar-avatar" />
        <div className="sidebar-userinfo">
          <span className="sidebar-username">{user?.username || '用户'}</span>
          <button className="logout-btn" onClick={onLogout}>
            退出
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="sidebar-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索聊天"
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* 会话列表 */}
      <div className="sidebar-conversations">
        {conversations.length === 0 && (
          <div className="conv-placeholder">
            {searchFilter ? '暂无相关聊天' : '暂无在线用户'}
          </div>
        )}
        {conversations.map((conv) => {
          const key = `${conv.type}:${conv.target}`;
          const isActive =
            activeConv?.type === conv.type && activeConv?.target === conv.target;
          const isDismissed = conv.type === 'group' && conv.groupData?.isDismissed;

          return (
            <div
              key={key}
              className={`conv-item${isActive ? ' active' : ''}${isDismissed ? ' dismissed' : ''}`}
              onClick={() => onSelectConversation(conv.type, conv.target)}
            >
              <img
                src={conv.avatar || ''}
                alt=""
                className="conv-avatar"
                onError={(e) => {
                  // 图片加载失败时显示默认头像
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" fill="#ddd" rx="22"/><text x="22" y="22" text-anchor="middle" dominant-baseline="central" fill="#999" font-size="18" font-family="Arial,sans-serif">${escapeHtml(conv.name.charAt(0))}</text></svg>`
                    );
                }}
              />
              <div className="conv-info">
                <span className="conv-name">{conv.name}</span>
                <span className="conv-preview">
                  {conv.type === 'group'
                    ? isDismissed
                      ? '已解散'
                      : `${conv.groupData?.members?.length || 0}人`
                    : '私聊'}
                </span>
              </div>
              {conv.unread > 0 && (
                <span className="unread-badge">
                  {conv.unread > 99 ? '99+' : conv.unread}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
