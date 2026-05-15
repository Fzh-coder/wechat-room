import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entity/message.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  async saveMessage(
    userId: number,
    username: string,
    content: string,
    avatar: string,
    toUser?: string,
    room?: string,
  ) {
    const msg = this.messages.create({
      userId,
      username,
      content,
      avatar,
      toUser,
      room,
    });
    return this.messages.save(msg);
  }

  async getHistory(
    fromUser?: string,
    toUser?: string,
    room?: string,
    limit = 50,
  ) {
    // 私聊历史：查询两人之间的往来消息
    if (fromUser && toUser) {
      return this.messages.find({
        where: [
          { username: fromUser, toUser },
          { username: toUser, toUser: fromUser },
        ],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }
    // 群聊历史：按 room 查询
    if (room) {
      return this.messages.find({
        where: { room },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }
    // 默认返回所有消息
    return this.messages.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
