import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity')
export class Activity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  image?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'start_at', type: 'datetime' })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'datetime' })
  endAt!: Date;

  @Column({ name: 'coupon_id', type: 'int', nullable: true })
  couponId?: number;

  @Column({ length: 10, default: 'draft' })
  status!: string;

  @Column({ name: 'visibility_type', length: 10, default: 'all' })
  visibilityType!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}