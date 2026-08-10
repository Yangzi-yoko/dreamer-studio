import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('point_coupon')
export class PointsCoupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ type: 'int', default: 0 })
  point!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'limit_per_user', type: 'int', default: 0 })
  limitPerUser!: number;

  @Column({ type: 'int', default: 0 })
  exchanged!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}