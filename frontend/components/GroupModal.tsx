import { useState } from 'react';
import { generateAvatar, escapeHtml } from '../utils/helpers';

interface GroupModalProps {
  onlineUsers: any[];
  currentUser?: string;
  currentAvatar?: string;
  onCreateGroup: (data: { groupName: string; members: string[]; avatar?: string }) => void;
  onClose: () => void;
}

export default function GroupModal({
  onlineUsers,
  currentUser,
  currentAvatar,
  onCreateGroup,
  onClose,
}: GroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // 切换成员选择
  const toggleMember = (username: string) => {
    setSelectedMembers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  // 确认创建
  const handleCreate = () => {
    const name = groupName.trim() || `群聊-${new Date().toLocaleString('zh-CN', { hour12: false }).replace(/[/: ]/g, '')}`;
    if (selectedMembers.length === 0) {
      alert('请至少选择一个成员');
      return;
    }
    onCreateGroup({ groupName: name, members: selectedMembers });
  };

  // 过滤掉当前用户
  const otherUsers = onlineUsers.filter((u) => (u.username || u.userName) !== currentUser);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>创建群聊</h3>
          <span className="modal-close" onClick={onClose}>
            &times;
          </span>
        </div>

        <div className="modal-body">
          {/* 群聊名称 */}
          <div className="modal-input-group">
            <label>群聊名称</label>
            <input
              type="text"
              placeholder="输入群聊名称（留空自动生成）"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* 选择成员 */}
          <div className="modal-input-group">
            <label>选择成员</label>
            <div className="member-list">
              {otherUsers.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                  暂无可选用户
                </div>
              )}
              {otherUsers.map((u, idx) => {
                const uname = u.username || u.userName;
                return (
                  <label key={idx} className="member-item">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(uname)}
                      onChange={() => toggleMember(uname)}
                    />
                    <img
                      src={u.avatar || ''}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = generateAvatar(uname);
                      }}
                    />
                    <span>{escapeHtml(uname)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="modal-btn confirm-btn"
            onClick={handleCreate}
            disabled={selectedMembers.length === 0}
          >
            确定创建
          </button>
        </div>
      </div>
    </div>
  );
}
