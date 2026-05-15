import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  //校验用户
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.validateUser(username, password);
    if (user) {
      //返回不包含密码的用户信息，以便生成JWT
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  //登录成功后生成JWT
  async login(user: any) {
    const paylaod = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(paylaod),
    };
  }
}
