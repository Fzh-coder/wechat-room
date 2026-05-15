import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 存储在线用户
  private users: { [socketId: string]: { username: string; avatar?: string } } =
    {};

  // 存储群组
  private groups: {
    [groupName: string]: {
      name: string;
      members: string[];
      createdBy: string;
      avatar?: string;
      isDismissed: boolean;       // 是否已解散
      deletedBy: string[];        // 已删除该群聊的用户名列表
    };
  } = {};

  // 生成默认群头像（SVG dataURL，带群名首字和彩色背景）
  private generateDefaultGroupAvatar(groupName: string): string {
    const firstChar = groupName.charAt(0) || '群';
    const colors = ['#07c160', '#1aad19', '#10aeff', '#ff6600', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c'];
    const color = colors[groupName.length % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<rect width="120" height="120" fill="${color}" rx="16"/>
<text x="60" y="60" text-anchor="middle" dominant-baseline="central" fill="white" font-size="48" font-family="Arial, sans-serif" font-weight="bold">${this.escapeXml(firstChar)}</text>
</svg>`;
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 向所有在线用户广播群组列表（按 deletedBy 过滤）
  private broadcastGroupList(): void {
    const allGroups = Object.values(this.groups);
    for (const [sid, user] of Object.entries(this.users)) {
      const filtered = allGroups.filter(
        g => !g.deletedBy.includes(user.username),
      );
      // 使用 server.to(sid) 确保消息可靠送达（每个 socket 自动加入以自身 ID 命名的房间）
      this.server.to(sid).emit('groupList', filtered);
    }
  }

  // 用户连接
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  // 用户断开连接
  handleDisconnect(client: Socket) {
    const user = this.users[client.id];
    if (user) {
      this.server.emit('delUser', user);
      delete this.users[client.id];
      const userList = Object.entries(this.users).map(([sid, u]) => ({
        ...u,
        socketId: sid,
      }));
      this.server.emit('userList', userList);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  // 登录 — 支持多端登录，已有用户从旧 socket 移除
  @SubscribeMessage('login')
  handleLogin(
    @MessageBody() data: { username: string; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 查找该用户是否已有其他 socket 连接
    const oldEntry = Object.entries(this.users).find(
      ([, u]) => u.username === data.username,
    );
    if (oldEntry) {
      const [oldSocketId] = oldEntry;
      delete this.users[oldSocketId];
    }
    // 存储新连接
    this.users[client.id] = data;
    client.emit('loginSuccess', data);
    // 只广播给其他客户端，不给自己发 addUser
    client.broadcast.emit('addUser', data);

    // 重新加入该用户所属的所有群组（跳过已删除的）
    for (const groupName of Object.keys(this.groups)) {
      const group = this.groups[groupName];
      if (group.members.includes(data.username) && !group.deletedBy.includes(data.username)) {
        client.join(groupName);
      }
    }

    // 用户列表广播给所有客户端（包括自己）
    const userList = Object.entries(this.users).map(([sid, u]) => ({
      ...u,
      socketId: sid,
    }));
    this.server.emit('userList', userList);
    // 发送群组列表给当前客户端（过滤掉已删除的）
    const filtered = Object.values(this.groups).filter(
      g => !g.deletedBy.includes(data.username),
    );
    client.emit('groupList', filtered);
  }

  //=== 群组相关 ===

  // 获取群组列表
  @SubscribeMessage('getGroups')
  handleGetGroups(@ConnectedSocket() client: Socket) {
    const user = this.users[client.id];
    if (user) {
      const filtered = Object.values(this.groups).filter(
        g => !g.deletedBy.includes(user.username),
      );
      client.emit('groupList', filtered);
    } else {
      client.emit('groupList', []);
    }
  }

  // 创建群组
  @SubscribeMessage('createGroup')
  handleCreateGroup(
    @MessageBody()
    data: { groupName: string; createdBy: string; members?: string[]; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const name = data.groupName.trim();
    if (!name) {
      client.emit('groupError', { message: '群名不能为空' });
      return;
    }
    if (this.groups[name]) {
      client.emit('groupError', { message: '群已存在' });
      return;
    }
    // 合并发起人和所选成员
    const allMembers = [data.createdBy, ...(data.members || [])];
    this.groups[name] = {
      name,
      members: allMembers,
      createdBy: data.createdBy,
      avatar: data.avatar || this.generateDefaultGroupAvatar(name),
      isDismissed: false,
      deletedBy: [],
    };
    // 将所有在线成员加入房间
    for (const [sid, user] of Object.entries(this.users)) {
      if (allMembers.includes(user.username)) {
        const memberSocket = this.server.sockets.sockets.get(sid);
        if (memberSocket) {
          memberSocket.join(name);
        }
      }
    }
    client.join(name);
    // 通知创建者
    client.emit('youJoinedGroup', {
      name,
      members: allMembers,
      createdBy: data.createdBy,
      avatar: this.groups[name].avatar,
      isDismissed: false,
    });
    // 显式通知每个被邀请的在线成员
    for (const [sid, user] of Object.entries(this.users)) {
      if (data.members && data.members.includes(user.username)) {
        this.server.to(sid).emit('youJoinedGroup', {
          name,
          members: allMembers,
          createdBy: data.createdBy,
          avatar: this.groups[name].avatar,
          isDismissed: false,
        });
      }
    }
    this.broadcastGroupList();
  }

  // 加入群组
  @SubscribeMessage('joinGroup')
  handleJoinGroup(
    @MessageBody() data: { groupName: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const group = this.groups[data.groupName];
    if (!group) {
      client.emit('groupError', { message: '群组不存在' });
      return;
    }
    if (group.isDismissed) {
      client.emit('groupError', { message: '群聊已解散，无法加入' });
      return;
    }
    if (!group.members.includes(data.username)) {
      group.members.push(data.username);
    }
    client.join(data.groupName);
    client.emit('systemMsg', `你加入了群聊「${data.groupName}」`);
    client
      .to(data.groupName)
      .emit('systemMsg', `${data.username} 加入了群聊「${data.groupName}」`);
    this.broadcastGroupList();
  }

  // 邀请用户加入群组
  @SubscribeMessage('inviteToGroup')
  handleInviteToGroup(
    @MessageBody()
    data: { groupName: string; targetUser: string; fromUser: string },
    @ConnectedSocket() client: Socket,
  ) {
    const group = this.groups[data.groupName];
    if (!group) {
      client.emit('groupError', { message: '群组不存在' });
      return;
    }
    if (group.isDismissed) {
      client.emit('groupError', { message: '群聊已解散，无法邀请成员' });
      return;
    }
    if (!group.members.includes(data.targetUser)) {
      group.members.push(data.targetUser);
    }
    // 如果该用户之前删除过此群聊，清除删除记录使其能重新看到
    const delIdx = group.deletedBy.indexOf(data.targetUser);
    if (delIdx !== -1) {
      group.deletedBy.splice(delIdx, 1);
    }
    // 查找被邀请用户的 socket，加入 room 并发送通知
    for (const [sid, user] of Object.entries(this.users)) {
      if (user.username === data.targetUser) {
        const targetSocket = this.server.sockets.sockets.get(sid);
        if (targetSocket) {
          targetSocket.join(data.groupName);
          targetSocket.emit('youJoinedGroup', {
            name: data.groupName,
            members: group.members,
            createdBy: group.createdBy,
            avatar: group.avatar,
            isDismissed: group.isDismissed,
          });
        }
        break;
      }
    }
    client.emit(
      'systemMsg',
      `已邀请 ${data.targetUser} 加入群聊「${data.groupName}」`,
    );
    this.broadcastGroupList();
  }

  // 退出群聊（创建者不能退出，只能解散）
  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @MessageBody() data: { groupName: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const group = this.groups[data.groupName];
    if (!group) {
      client.emit('groupError', { message: '群组不存在' });
      return;
    }
    if (group.createdBy === data.username) {
      client.emit('groupError', { message: '创建者不能退出群聊，请使用解散群聊功能' });
      return;
    }
    const idx = group.members.indexOf(data.username);
    if (idx !== -1) {
      group.members.splice(idx, 1);
    }
    client.leave(data.groupName);
    client.emit('groupLeft', { groupName: data.groupName });
    this.broadcastGroupList();
  }

  // 解散群聊（仅创建者可用）
  @SubscribeMessage('dismissGroup')
  handleDismissGroup(
    @MessageBody() data: { groupName: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const group = this.groups[data.groupName];
    if (!group) {
      client.emit('groupError', { message: '群组不存在' });
      return;
    }
    if (group.createdBy !== data.username) {
      client.emit('groupError', { message: '只有创建者可以解散群聊' });
      return;
    }
    if (group.isDismissed) {
      client.emit('groupError', { message: '该群聊已被解散' });
      return;
    }
    // 标记群组为已解散（不删除，保留以便成员查看和删除）
    group.isDismissed = true;
    // 通知所有群成员该群已解散
    this.server.to(data.groupName).emit('groupDismissed', {
      groupName: data.groupName,
      isDismissed: true,
    });
    // 广播更新后的群列表（包含已解散状态）
    this.broadcastGroupList();
  }

  // 用户侧删除已解散的群聊会话
  @SubscribeMessage('removeDismissedGroup')
  handleRemoveDismissedGroup(
    @MessageBody() data: { groupName: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const group = this.groups[data.groupName];
    if (!group) {
      client.emit('groupError', { message: '群组不存在' });
      return;
    }
    if (!group.isDismissed) {
      client.emit('groupError', { message: '只能删除已解散的群聊' });
      return;
    }
    if (!group.deletedBy.includes(data.username)) {
      group.deletedBy.push(data.username);
    }
    client.emit('groupRemoved', { groupName: data.groupName });
  }

  //=== 消息 ===

  // 全员广播消息
  @SubscribeMessage('sendMsg')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.server.emit('receiveMsg', data);
  }

  // 加入房间
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { room: string; username: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    client
      .to(data.room)
      .emit('systemMsg', `${data.username} 进入了房间 ${data.room}`);
  }

  // 发送群消息 — 检查群聊是否已解散
  @SubscribeMessage('roomMsg')
  handleRoomMsg(
    @MessageBody()
    data: { room: string; username: string; msg: string; avatar?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 如果群聊已解散，拒绝发送消息
    const group = this.groups[data.room];
    if (group && group.isDismissed) {
      client.emit('systemMsg', '该群聊已被解散，无法发送消息');
      return;
    }
    client.to(data.room).emit('roomMsg', data);
  }

  // 私聊：支持 byName 方式，传入对方用户名
  @SubscribeMessage('privateMsg')
  handlePrivateMsg(
    @MessageBody()
    data: {
      toSocketId: string;
      from: string;
      msg: string;
      avatar?: string;
      isByName?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.isByName) {
      // 通过用户名查找 socketId
      for (const [sid, user] of Object.entries(this.users)) {
        if (user.username === data.toSocketId) {
          this.server.to(sid).emit('privateMsg', {
            from: data.from,
            msg: data.msg,
            avatar: data.avatar,
          });
          return;
        }
      }
      client.emit('systemMsg', `用户 ${data.toSocketId} 不在线，无法发送私聊`);
    } else {
      this.server.to(data.toSocketId).emit('privateMsg', {
        from: data.from,
        msg: data.msg,
        avatar: data.avatar,
      });
    }
  }

  // 全局广播
  @SubscribeMessage('broadcast')
  handleBroadcast(
    @MessageBody() data: { from: string; msg: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.broadcast.emit('broadcast', data);
  }
}
