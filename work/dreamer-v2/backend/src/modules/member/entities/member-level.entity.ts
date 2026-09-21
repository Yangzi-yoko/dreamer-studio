import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('member_level')
export class MemberLevel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 32 })
  name!: string;

  @Column({ name: 'min_spend_cents', type: 'int', default: 0 })
  minSpendCents!: number;

  @Column({ name: 'min_orders', type: 'int', default: 0 })
  minOrders!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @Column({ length: 16, nullable: true })
  icon?: string;

  @Column({ length: 16, nullable: true })
  color?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  discount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
