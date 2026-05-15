import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '头像', example: 'avatar1.png', required: false })
  avatar?: string;

  @ApiProperty({ description: '用户名', example: 'Mike' })
  username?: string;

  @ApiProperty({ description: '密码', example: '123456' })
  password?: string;
}
