import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('member_wallet')
export class MemberWallet {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'balance_cents', type: 'int', default: 0 })
  balanceCents!: number;

  @Column({ name: 'principal_cents', type: 'int', default: 0 })
  principalCents!: number;

  @Column({ name: 'bonus_cents', type: 'int', default: 0 })
  bonusCents!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
