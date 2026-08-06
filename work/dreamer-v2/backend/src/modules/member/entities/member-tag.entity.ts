import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from './member.entity';

@Entity('member_tag')
export class MemberTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 32 })
  name!: string;

  @Column({ length: 16, nullable: true })
  color?: string;

  @ManyToMany(() => Member, (member) => member.tags)
  members!: Member[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
