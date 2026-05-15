import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 注册接口
  @Post('register')
  async register(@Body() createUsersDto: CreateUserDto) {
    const { username, password, avatar } = createUsersDto;
    if (!username || !password) {
      throw new BadGatewayException('用户名和密码不能为空');
    }
    // 判断该用户是否存在
    const exist = await this.usersService.findOne(username);
    if (exist) {
      throw new BadGatewayException('用户已存在');
    }
    // 若用户不存在，则注册为新用户（密码会在 service 中自动 hash）
    const user = await this.usersService.create(username, password, avatar);
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    };
  }

  // 上传头像接口
  @Post('avatar')
  async uploadAvatar(@Body() body: { username: string; avatar: string }) {
    return this.usersService.updateAvatar(body.username, body.avatar);
  }

  // 查询所有用户
  @Get('all')
  async findAll() {
    return this.usersService.findAll();
  }

  // 查询用户是否有头像
  @Get('has-avatar')
  async hasAvatar(@Query('username') username: string) {
    return this.usersService.hasAvatar(username);
  }
}
