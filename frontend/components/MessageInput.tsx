import { useState, useRef, useEffect, useCallback } from 'react';

// Emoji 列表
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙃', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤗',
  '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😵',
  '🤯', '🥳', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '💀', '☠️', '👋',
  '✋', '✌️', '🤞', '🤟', '🤘', '🤙', '👌', '👍', '👎', '✊', '👊', '🤛',
  '🤜', '👏', '🙌', '👐', '🤲', '🙏', '💪', '🧠', '👀', '👅', '👄', '💋',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞',
  '💗', '💖', '💘', '💝', '🌟', '⭐', '🔥', '💫', '✨', '🎉', '🎊', '🎈',
  '🎁', '🎀', '💡', '📌', '📍', '💬', '💯', '✅', '❌', '❓', '❗', '➕',
  '➖', '➗', '♻️', '💤',
];

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendImage: (file: File) => void;
}

export default function MessageInput({ onSendMessage, onSendImage }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭表情面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.emoji-btn')
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 发送
  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
    inputRef.current?.focus();
  }, [text, onSendMessage]);

  // 快捷键：Ctrl+Enter 或 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 选择表情
  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // 图片上传
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onSendImage(file);
    e.target.value = '';
  };

  return (
    <div className="chat-input-area">
      {/* 工具栏 */}
      <div className="chat-tools">
        {/* 表情按钮 */}
        <button
          className="tool-btn emoji-btn"
          onClick={() => setShowEmoji((v) => !v)}
          title="表情"
        >
          😊
        </button>

        {/* 图片上传 */}
        <label className="tool-btn" title="图片">
          🖼️
          <input
            type="file"
            accept="image/*"
            className="d-none"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {/* 输入框 */}
      <div className="chat-input-box">
        <textarea
          ref={inputRef}
          className="chat-edit"
          placeholder="输入消息..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
      </div>

      {/* 发送按钮 */}
      <div className="chat-send">
        <button onClick={handleSend} disabled={!text.trim()}>
          发送
        </button>
      </div>

      {/* 表情面板 */}
      {showEmoji && (
        <div className="emoji-panel" ref={emojiRef}>
          <div className="emoji-grid">
            {EMOJIS.map((emoji, idx) => (
              <span
                key={idx}
                className="emoji-item"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
