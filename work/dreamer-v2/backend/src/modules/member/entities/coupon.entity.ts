import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coupon')
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64 })
  name!: string;

  @Column({ length: 8 })
  type!: 'amount' | 'discount';

  @Column({ type: 'int', default: 0 })
  value!: number;

  @Column({ name: 'min_spend_cents', type: 'int', default: 0 })
  minSpendCents!: number;

  @Column({ name: 'total_count', type: 'int', default: 0 })
  totalCount!: number;

  @Column({ name: 'issued_count', type: 'int', default: 0 })
  issuedCount!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
