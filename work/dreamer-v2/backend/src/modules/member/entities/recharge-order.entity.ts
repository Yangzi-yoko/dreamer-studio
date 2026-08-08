import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('recharge_order')
export class RechargeOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_no', unique: true, length: 32 })
  orderNo!: string;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ length: 10, default: 'pending' })
  status!: 'pending' | 'paid' | 'cancelled';

  @Column({ length: 128, nullable: true })
  remark?: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
