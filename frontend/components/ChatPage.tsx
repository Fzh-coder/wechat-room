import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { generateAvatar, convKey } from '../utils/helpers';
import api from '../utils/api';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import RightPanel from './RightPanel';
import GroupModal from './GroupModal';

interface ActiveConv {
  type: 'private' | 'group';
  target: string;
  name: string;
  avatar?: string;
  groupData?: any;
}

interface Message {
  id?: number;
  username: string;
  content: string;
  avatar?: string;
  timestamp: number;
  isSelf: boolean;
}

interface Conversation {
  type: 'private' | 'group';
  target: string;
  name: string;
  avatar?: string;
  unread: number;
  groupData?: any;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function ChatPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  // Socket 相关
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [groupList, setGroupList] = useState<any[]>([]);

  // 聊天状态
  const [activeConv, setActiveConv] = useState<ActiveConv | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // 用于 socket 回调的 ref（避免闭包捕获过期值）
  const activeConvRef = useRef<ActiveConv | null>(null);
  const userRef = useRef(user);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { userRef.current = user; }, [user]);

  // ===== 路由守卫：未登录跳转首页 =====
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  // ===== Socket 连接 =====
  useEffect(() => {
    if (!user) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // 登录后发送 login 事件
      socket.emit('login', {
        username: user.username,
        avatar: user.avatar || generateAvatar(user.username),
      });
    });

    socket.on('loginSuccess', (data: any) => {
      console.log(' Socket 登录成功:', data);
    });

    socket.on('userList', (users: any[]) => {
      setOnlineUsers(users);
    });

    socket.on('groupList', (groups: any[]) => {
      setGroupList(groups);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err: any) => {
      console.error(' Socket 连接失败:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // ===== Socket 事件监听（消息、群组变更等） =====
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // ---- 私聊消息 ----
    const handlePrivateMsg = (data: { from: string; msg: string; avatar?: string }) => {
      const current = activeConvRef.current;
      const isActive = current?.type === 'private' && current.target === data.from;

      if (isActive) {
        setMessages((prev) => [...prev, {
          username: data.from, content: data.msg, avatar: data.avatar,
          timestamp: Date.now(), isSelf: false,
        }]);
        scrollToBottom();
      } else {
        const key = convKey('private', data.from);
        setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    };

    // ---- 群聊消息 ----
    const handleRoomMsg = (data: { room: string; username: string; msg: string; avatar?: string }) => {
      const current = activeConvRef.current;
      const isActive = current?.type === 'group' && current.target === data.room;

      if (isActive) {
        setMessages((prev) => [...prev, {
          username: data.username, content: data.msg, avatar: data.avatar,
          timestamp: Date.now(), isSelf: data.username === userRef.current?.username,
        }]);
        scrollToBottom();
      } else {
        const key = convKey('group', data.room);
        setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      }
    };

    // ---- 系统消息 ----
    const handleSystemMsg = (msg: string) => {
      setMessages((prev) => [...prev, {
        username: '系统', content: msg,
        timestamp: Date.now(), isSelf: false,
      }]);
      scrollToBottom();
    };

    // ---- 加入群聊通知 ----
    const handleYouJoinedGroup = (group: any) => {
      // 如果 groupList 中还没有，则添加
      setGroupList((prev) => {
        const exists = prev.find((g) => g.name === group.name);
        if (exists) return prev.map((g) => g.name === group.name ? group : g);
        return [...prev, group];
      });
    };

    // ---- 群聊解散通知 ----
    const handleGroupDismissed = (data: { groupName: string }) => {
      setGroupList((prev) =>
        prev.map((g) => g.name === data.groupName ? { ...g, isDismissed: true } : g)
      );
      // 如果当前正在查看该群聊，显示已解散状态
      const current = activeConvRef.current;
      if (current?.type === 'group' && current.target === data.groupName) {
        setMessages((prev) => [...prev, {
          username: '系统', content: '该群聊已被解散',
          timestamp: Date.now(), isSelf: false,
        }]);
      }
    };

    // ---- 退出群聊通知 ----
    const handleGroupLeft = (data: { groupName: string }) => {
      setGroupList((prev) => prev.filter((g) => g.name !== data.groupName));
    };

    // ---- 已删除群聊通知 ----
    const handleGroupRemoved = (data: { groupName: string }) => {
      setGroupList((prev) => prev.filter((g) => g.name !== data.groupName));
    };

    socket.on('privateMsg', handlePrivateMsg);
    socket.on('roomMsg', handleRoomMsg);
    socket.on('systemMsg', handleSystemMsg);
    socket.on('youJoinedGroup', handleYouJoinedGroup);
    socket.on('groupDismissed', handleGroupDismissed);
    socket.on('groupLeft', handleGroupLeft);
    socket.on('groupRemoved', handleGroupRemoved);

    return () => {
      socket.off('privateMsg', handlePrivateMsg);
      socket.off('roomMsg', handleRoomMsg);
      socket.off('systemMsg', handleSystemMsg);
      socket.off('youJoinedGroup', handleYouJoinedGroup);
      socket.off('groupDismissed', handleGroupDismissed);
      socket.off('groupLeft', handleGroupLeft);
      socket.off('groupRemoved', handleGroupRemoved);
    };
  }, []); // socket ref 不会变，空依赖即可

  // ===== 构建会话列表 =====
  const conversations = useMemo<Conversation[]>(() => {
    const list: Conversation[] = [];

    // 私聊会话：来自在线用户列表
    onlineUsers.forEach((u) => {
      if (u.username === user?.username) return;
      list.push({
        type: 'private',
        target: u.username,
        name: u.username,
        avatar: u.avatar,
        unread: unreadCounts[convKey('private', u.username)] || 0,
      });
    });

    // 群聊会话：来自群组列表
    groupList.forEach((g) => {
      list.push({
        type: 'group',
        target: g.name,
        name: g.name,
        avatar: g.avatar,
        unread: unreadCounts[convKey('group', g.name)] || 0,
        groupData: g,
      });
    });

    return list;
  }, [onlineUsers, groupList, unreadCounts, user]);

  // ===== 按搜索过滤会话 =====
  const filteredConversations = useMemo(() => {
    if (!searchFilter) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, searchFilter]);

  // ===== 切换会话 =====
  const switchConversation = useCallback(async (type: string, target: string) => {
    // 查找会话信息
    const conv = conversations.find((c) => c.type === type && c.target === target)
      || (type === 'private' ? onlineUsers.find((u) => u.username === target) : null);

    const name = conv?.name || target;
    const avatar = conv?.avatar || generateAvatar(target);
    const groupData = type === 'group' ? groupList.find((g) => g.name === target) : undefined;

    setActiveConv({ type: type as 'private' | 'group', target, name, avatar, groupData } as ActiveConv);

    // 清除未读计数
    const key = convKey(type, target);
    setUnreadCounts((prev) => ({ ...prev, [key]: 0 }));

    // 加载历史消息
    try {
      let msgs: any[];
      if (type === 'private') {
        const res = await api.get('/messages/history', {
          params: { fromUser: user?.username, toUser: target, limit: 50 },
        });
        msgs = (res.data || []).reverse();
      } else {
        const res = await api.get('/messages/history', {
          params: { room: target, limit: 50 },
        });
        msgs = (res.data || []).reverse();
      }

      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          username: m.username,
          content: m.content,
          avatar: m.avatar,
          timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
          isSelf: m.username === user?.username,
        }))
      );
    } catch {
      setMessages([]);
    }

    // 滚动到底部
    setTimeout(scrollToBottom, 100);
  }, [conversations, onlineUsers, groupList, user]);

  // ===== 滚动到底部 =====
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // ===== 发送消息 =====
  const handleSendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    const currentUser = userRef.current;
    const currentConv = activeConvRef.current;
    if (!socket || !currentUser || !currentConv || !content.trim()) return;

    const msgText = content.trim();

    if (currentConv.type === 'group') {
      // 检查群聊是否已解散
      const group = groupList.find((g) => g.name === currentConv.target);
      if (group?.isDismissed) {
        alert('该群聊已被解散，无法发送消息');
        return;
      }
      socket.emit('roomMsg', {
        room: currentConv.target,
        username: currentUser.username,
        msg: msgText,
        avatar: currentUser.avatar,
      });
    } else {
      // 私聊：优先使用 socketId，失败则按用户名查找
      const targetUser = onlineUsers.find((u) => u.username === currentConv.target);
      if (targetUser?.socketId) {
        socket.emit('privateMsg', {
          toSocketId: targetUser.socketId,
          from: currentUser.username,
          msg: msgText,
          avatar: currentUser.avatar,
        });
      } else {
        socket.emit('privateMsg', {
          toSocketId: currentConv.target,
          from: currentUser.username,
          msg: msgText,
          avatar: currentUser.avatar,
          isByName: true,
        });
      }
    }

    // 本地追加消息
    setMessages((prev) => [...prev, {
      username: currentUser.username,
      content: msgText,
      avatar: currentUser.avatar,
      timestamp: Date.now(),
      isSelf: true,
    }]);
    scrollToBottom();
  }, [onlineUsers, groupList, scrollToBottom]);

  // ===== 发送图片 =====
  const handleSendImage = useCallback(async (file: File) => {
    const socket = socketRef.current;
    const currentUser = userRef.current;
    const currentConv = activeConvRef.current;
    if (!socket || !currentUser || !currentConv) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgUrl = res.data.url;
      // 图片消息以 HTML img 标签形式发送
      const imgHtml = `<img src="${imgUrl}" style="max-width:200px;border-radius:8px" alt="图片" />`;

      if (currentConv.type === 'group') {
        socket.emit('roomMsg', {
          room: currentConv.target,
          username: currentUser.username,
          msg: imgHtml,
          avatar: currentUser.avatar,
        });
      } else {
        const targetUser = onlineUsers.find((u) => u.username === currentConv.target);
        if (targetUser?.socketId) {
          socket.emit('privateMsg', {
            toSocketId: targetUser.socketId,
            from: currentUser.username,
            msg: imgHtml,
            avatar: currentUser.avatar,
          });
        } else {
          socket.emit('privateMsg', {
            toSocketId: currentConv.target,
            from: currentUser.username,
            msg: imgHtml,
            avatar: currentUser.avatar,
            isByName: true,
          });
        }
      }

      setMessages((prev) => [...prev, {
        username: currentUser.username,
        content: imgHtml,
        avatar: currentUser.avatar,
        timestamp: Date.now(),
        isSelf: true,
      }]);
      scrollToBottom();
    } catch (err) {
      alert('图片上传失败，请重试');
    }
  }, [onlineUsers, scrollToBottom]);

  // ===== 创建群聊 =====
  const handleCreateGroup = useCallback((data: { groupName: string; members: string[]; avatar?: string }) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    socketRef.current?.emit('createGroup', {
      groupName: data.groupName,
      createdBy: currentUser.username,
      members: data.members,
      avatar: data.avatar,
    });
    setShowGroupModal(false);
  }, []);

  // ===== 退出群聊 =====
  const handleLeaveGroup = useCallback(() => {
    const currentUser = userRef.current;
    const currentConv = activeConvRef.current;
    if (!currentUser || !currentConv || currentConv.type !== 'group') return;
    if (!confirm(`确定退出群聊「${currentConv.target}」吗？`)) return;
    socketRef.current?.emit('leaveGroup', {
      groupName: currentConv.target,
      username: currentUser.username,
    });
    setActiveConv(null);
    setMessages([]);
  }, []);

  // ===== 解散群聊 =====
  const handleDismissGroup = useCallback(() => {
    const currentUser = userRef.current;
    const currentConv = activeConvRef.current;
    if (!currentUser || !currentConv || currentConv.type !== 'group') return;
    if (!confirm(`确定解散群聊「${currentConv.target}」吗？此操作不可撤销。`)) return;
    socketRef.current?.emit('dismissGroup', {
      groupName: currentConv.target,
      username: currentUser.username,
    });
  }, []);

  // ===== 删除已解散群聊会话 =====
  const handleRemoveGroup = useCallback(() => {
    const currentUser = userRef.current;
    const currentConv = activeConvRef.current;
    if (!currentUser || !currentConv || currentConv.type !== 'group') return;
    if (!confirm(`确定删除该群聊会话吗？删除后不再显示。`)) return;
    socketRef.current?.emit('removeDismissedGroup', {
      groupName: currentConv.target,
      username: currentUser.username,
    });
    setActiveConv(null);
    setMessages([]);
    // 从本地 groupList 中移除
    setGroupList((prev) => prev.filter((g) => g.name !== currentConv.target));
  }, []);

  // ===== 从右面板启动私聊 =====
  const handleStartPrivateChat = useCallback((username: string) => {
    // 如果该用户已在会话列表中，直接切换
    const exists = conversations.find((c) => c.type === 'private' && c.target === username);
    if (exists) {
      switchConversation('private', username);
      return;
    }
    // 否则创建临时会话并切换
    const userData = onlineUsers.find((u) => u.username === username);
    const target = userData?.username || username;
    if (target) {
      switchConversation('private', target);
    }
  }, [conversations, onlineUsers, switchConversation]);

  // ===== 当前群组的元数据 =====
  const currentGroup = activeConv?.type === 'group'
    ? groupList.find((g) => g.name === activeConv.target)
    : null;

  const isGroupDismissed = currentGroup?.isDismissed === true;
  const isGroupCreator = currentGroup?.createdBy === user?.username;

  if (loading || !isAuthenticated) return null;

  return (
    <div className="all">
      <div className="container">
        <div id="chat-container">
          {/* 左侧：会话列表 */}
          <Sidebar
            user={user}
            conversations={filteredConversations}
            activeConv={activeConv}
            searchFilter={searchFilter}
            onSearchChange={setSearchFilter}
            onSelectConversation={switchConversation}
            onLogout={logout}
          />

          {/* 中间：聊天区域 */}
          <div className="chat-main">
            {/* 聊天头部 */}
            <div className="chat-header">
              <div className="chat-header-left">
                {activeConv && (
                  <span
                    className="back-btn"
                    onClick={() => {
                      setActiveConv(null);
                      setMessages([]);
                    }}
                    title="返回"
                  >
                    ←
                  </span>
                )}
                <span className="chat-header-name">
                  {activeConv ? activeConv.name : '欢迎'}
                </span>
                <span className="chat-header-type">
                  {activeConv
                    ? activeConv.type === 'group'
                      ? isGroupDismissed ? '已解散' : '群聊'
                      : '私聊'
                    : '聊天'}
                </span>
              </div>
              {/* 群聊操作按钮 */}
              {activeConv?.type === 'group' && (
                <div className="chat-header-actions">
                  {isGroupDismissed ? (
                    <button className="header-btn danger-btn" onClick={handleRemoveGroup}>
                      删除会话
                    </button>
                  ) : isGroupCreator ? (
                    <button className="header-btn danger-btn" onClick={handleDismissGroup}>
                      解散群聊
                    </button>
                  ) : (
                    <button className="header-btn" onClick={handleLeaveGroup}>
                      退出群聊
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 消息列表 */}
            <ChatArea
              messages={messages}
              activeConv={activeConv}
              isGroupDismissed={isGroupDismissed}
              messagesEndRef={messagesEndRef}
            />

            {/* 输入区域 */}
            {activeConv && !isGroupDismissed && (
              <MessageInput
                onSendMessage={handleSendMessage}
                onSendImage={handleSendImage}
              />
            )}
          </div>

          {/* 右侧：用户列表 */}
          <RightPanel
            onlineUsers={onlineUsers}
            groupList={groupList}
            currentUser={user?.username}
            onStartPrivateChat={handleStartPrivateChat}
            onSelectGroup={(name) => switchConversation('group', name)}
            onCreateGroup={() => setShowGroupModal(true)}
          />
        </div>
      </div>

      {/* 创建群聊模态框 */}
      {showGroupModal && (
        <GroupModal
          onlineUsers={onlineUsers}
          currentUser={user?.username}
          currentAvatar={user?.avatar}
          onCreateGroup={handleCreateGroup}
          onClose={() => setShowGroupModal(false)}
        />
      )}
    </div>
  );
}
