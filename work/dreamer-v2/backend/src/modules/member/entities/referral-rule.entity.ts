import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('referral_rule')
export class ReferralRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', default: 0 })
  percent!: number;

  @Column({ name: 'fixed_cents', type: 'int', default: 0 })
  fixedCents!: number;

  @Column({ default: false })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
