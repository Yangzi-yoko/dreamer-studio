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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
