import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('point_coupon_log')
export class PointsCouponLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'points_coupon_id', type: 'int' })
  pointsCouponId!: number;

  @Index()
  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ type: 'int', default: 0 })
  point!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}