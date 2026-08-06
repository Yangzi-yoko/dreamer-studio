import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupon_usage')
export class CouponUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'user_coupon_id', type: 'int' })
  userCouponId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'deduct_cents', type: 'int', default: 0 })
  deductCents!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
