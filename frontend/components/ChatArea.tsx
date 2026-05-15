import { escapeHtml, formatTime, isHtml } from '../utils/helpers';

interface Message {
  id?: number;
  username: string;
  content: string;
  avatar?: string;
  timestamp: number;
  isSelf: boolean;
}

interface ActiveConv {
  type: string;
  target: string;
  name: string;
  avatar?: string;
}

interface ChatAreaProps {
  messages: Message[];
  activeConv: ActiveConv | null;
  isGroupDismissed: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatArea({
  messages,
  activeConv,
  isGroupDismissed,
  messagesEndRef,
}: ChatAreaProps) {
  if (!activeConv) {
    return (
      <div className="chat-messages">
        <div className="system-info">选择一个用户或群聊开始聊天</div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.length === 0 && (
        <div className="system-info">
          {isGroupDismissed
            ? '该群聊已被解散'
            : activeConv.type === 'group'
            ? `开始群聊「${activeConv.name}」`
            : `开始与 ${activeConv.name} 私聊`}
        </div>
      )}

      {messages.map((msg, idx) => {
        const isSystem = msg.username === '系统';
        if (isSystem) {
          return (
            <div key={idx} className="system-info">
              {msg.content}
            </div>
          );
        }

        // 渲染消息内容（支持 HTML）
        const contentHtml = isHtml(msg.content) ? msg.content : escapeHtml(msg.content);

        return (
          <div key={idx} className={`msg ${msg.isSelf ? 'self' : 'other'}`}>
            {!msg.isSelf && (
              <img
                src={msg.avatar || ''}
                alt=""
                className="msg-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#ddd" rx="20"/><text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="#999" font-size="16" font-family="Arial,sans-serif">${escapeHtml(msg.username.charAt(0))}</text></svg>`
                    );
                }}
              />
            )}
            <div className="msg-body">
              {/* 群聊且非自己发送时显示昵称 */}
              {activeConv?.type === 'group' && !msg.isSelf && (
                <div className="msg-name">{escapeHtml(msg.username)}</div>
              )}
              <div
                className="msg-text"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
              <div className="msg-time">{formatTime(msg.timestamp)}</div>
            </div>
            {msg.isSelf && (
              <img
                src={msg.avatar || ''}
                alt=""
                className="msg-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#ddd" rx="20"/><text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="#999" font-size="16" font-family="Arial,sans-serif">${escapeHtml(msg.username.charAt(0))}</text></svg>`
                    );
                }}
              />
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
