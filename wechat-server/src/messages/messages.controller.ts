import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  async send(
    @Body()
    body: {
      userId: number;
      username: string;
      content: string;
      avatar: string;
      toUser?: string;
      room?: string;
    },
  ) {
    return this.messagesService.saveMessage(
      body.userId,
      body.username,
      body.content,
      body.avatar,
      body.toUser,
      body.room,
    );
  }

  // 支持按用户/房间查询历史消息
  @Get('history')
  async history(
    @Query('fromUser') fromUser?: string,
    @Query('toUser') toUser?: string,
    @Query('room') room?: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.messagesService.getHistory(fromUser, toUser, room, limit);
  }
}
