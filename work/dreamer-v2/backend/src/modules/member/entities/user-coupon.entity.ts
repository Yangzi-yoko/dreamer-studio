import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_coupon')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ length: 10, default: 'unused' })
  status!: string;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
