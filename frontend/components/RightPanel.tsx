import { escapeHtml, getGroupAvatarUrl } from '../utils/helpers';

interface RightPanelProps {
  onlineUsers: any[];
  groupList: any[];
  currentUser?: string;
  onStartPrivateChat: (username: string) => void;
  onSelectGroup: (name: string) => void;
  onCreateGroup: () => void;
}

export default function RightPanel({
  onlineUsers,
  groupList,
  currentUser,
  onStartPrivateChat,
  onSelectGroup,
  onCreateGroup,
}: RightPanelProps) {
  // 过滤出当前用户已加入的群聊（groupList 已经是过滤后的）
  const myGroups = groupList;

  return (
    <div className="chat-right-panel">
      <div className="panel-header">在线用户</div>
      <div className="panel-users">
        {/* 在线用户列表 */}
        {onlineUsers.map((u, idx) => {
          const uname = u.username || u.userName;
          const isMe = uname === currentUser;
          return (
            <div
              key={idx}
              className={`panel-user${isMe ? ' me' : ''}`}
              onClick={() => !isMe && onStartPrivateChat(uname)}
            >
              <img
                src={u.avatar || ''}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" fill="#ddd" rx="18"/><text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="#999" font-size="14" font-family="Arial,sans-serif">${escapeHtml(uname.charAt(0))}</text></svg>`
                    );
                }}
              />
              <span>{uname}{isMe ? ' (我)' : ''}</span>
            </div>
          );
        })}
        {onlineUsers.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            暂无在线用户
          </div>
        )}

        {/* 我的群聊 */}
        {myGroups.length > 0 && (
          <>
            <div className="sidebar-section-title">我的群聊</div>
            {myGroups.map((g, idx) => {
              const isDismissed = g.isDismissed;
              return (
                <div
                  key={idx}
                  className={`panel-user group-item${isDismissed ? ' dismissed' : ''}`}
                  onClick={() => !isDismissed && onSelectGroup(g.name)}
                >
                  <img
                    src={getGroupAvatarUrl(g)}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,' +
                        encodeURIComponent(
                          `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" fill="#07c160" rx="18"/><text x="18" y="18" text-anchor="middle" dominant-baseline="central" fill="white" font-size="16" font-family="Arial,sans-serif">${escapeHtml(g.name.charAt(0))}</text></svg>`
                        );
                    }}
                  />
                  <span>{escapeHtml(g.name)}</span>
                  <span className="group-member-count">
                    {isDismissed ? '已解散' : `${g.members?.length || 0}人`}
                  </span>
                </div>
              );
            })}
          </>
        )}

        {/* 创建群聊按钮 */}
        <div className="panel-actions">
          <button onClick={onCreateGroup}>+ 新建群聊</button>
        </div>
      </div>
    </div>
  );
}
