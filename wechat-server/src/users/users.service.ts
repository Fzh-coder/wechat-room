import { Injectable } from '@nestjs/common';
import { User } from './entity/user.entity';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly user: Repository<User>,
  ) {}

  // 注册新用户 — 使用 bcrypt.hash 存储密码哈希
  async create(
    username: string,
    password: string,
    avatar?: string,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.user.create({
      username,
      password: hashedPassword,
      avatar,
    });
    return this.user.save(user);
  }

  // 根据用户名查找用户
  async findOne(username: string): Promise<User | null> {
    return this.user.findOne({ where: { username } });
  }

  // 校验用户名和密码
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.user.findOne({ where: { username } });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  // 更新用户头像
  async updateAvatar(username: string, avatar: string) {
    const user = await this.user.findOne({ where: { username } });
    if (!user) {
      throw new Error('用户不存在');
    }
    user.avatar = avatar;
    return this.user.save(user);
  }

  // 查询所有用户
  async findAll(): Promise<User[]> {
    return this.user.find();
  }

  // 判断用户是否有头像
  async hasAvatar(
    username: string,
  ): Promise<{ username: string; hasAvatar: boolean }> {
    const user = await this.user.findOne({ where: { username } });
    return {
      username,
      hasAvatar: !!(user && user.avatar),
    };
  }
}
