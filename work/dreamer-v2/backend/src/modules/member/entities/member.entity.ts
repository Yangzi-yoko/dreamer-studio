import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MemberTag } from './member-tag.entity';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 20 })
  phone!: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @Column({ type: 'text', nullable: true })
  avatar?: string;

  @Column({ length: 5, nullable: true })
  birthday?: string;

  @Index()
  @Column({ name: 'level_id', type: 'int', nullable: true })
  levelId?: number;

  @Column({ name: 'total_spend_cents', type: 'int', default: 0 })
  totalSpendCents!: number;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders!: number;

  @Column({ default: 1 })
  status!: number;

  @ManyToMany(() => MemberTag, (tag) => tag.members)
  @JoinTable({ name: 'member_tag_relation' })
  tags!: MemberTag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
