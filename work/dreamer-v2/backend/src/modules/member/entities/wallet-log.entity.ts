import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallet_log')
export class WalletLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ length: 10 })
  type!: 'recharge' | 'deduct' | 'refund';

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents!: number;

  @Column({ name: 'balance_after_cents', type: 'int' })
  balanceAfterCents!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
