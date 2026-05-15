import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  userId?: number;

  @Column()
  username?: string;

  @Column()
  content?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  toUser?: string;

  @Column({ nullable: true })
  room?: string;

  @CreateDateColumn()
  createdAt?: Date;
}
