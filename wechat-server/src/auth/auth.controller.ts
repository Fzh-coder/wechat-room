import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login..dto';
import { JwtAuthGuard } from './jwt-auth-guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  //登录接口
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const users = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!users) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return this.authService.login(users);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
