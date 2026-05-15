/**
 * 转义 HTML 特殊字符，防止 XSS 攻击
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 检测字符串是否包含 HTML 标签
 */
export function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/**
 * 生成默认头像（基于用户名的首字母和颜色）
 */
const AVATAR_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
  '#fa709a', '#a18cd1', '#fbc2eb', '#84fab0', '#8fd3f4',
];

export function generateAvatar(name: string): string {
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const firstChar = name.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="${color}" rx="16"/>
    <text x="60" y="60" text-anchor="middle" dominant-baseline="central" fill="white" font-size="48" font-family="Arial,sans-serif" font-weight="bold">${escapeHtml(firstChar)}</text>
  </svg>`;
  // 浏览器兼容的 Base64 编码（不使用 Node.js Buffer）
  const base64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');
  return 'data:image/svg+xml;base64,' + base64;
}

/**
 * 获取群组头像 URL（优先使用服务器提供的，否则生成默认）
 */
export function getGroupAvatarUrl(group: any): string {
  if (group.avatar) return group.avatar;
  return generateAvatar(group.name || '群');
}

/**
 * 格式化时间戳
 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  // 今天只显示时间
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // 昨天显示"昨天 + 时间"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `昨天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // 今年显示月日时间
  if (d.getFullYear() === now.getFullYear()) {
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // 其他显示完整日期
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/**
 * 构建会话唯一键
 */
export function convKey(type: string, target: string): string {
  return `${type}:${target}`;
}
