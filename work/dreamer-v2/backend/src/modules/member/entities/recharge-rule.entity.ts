import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('recharge_rule')
export class RechargeRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'amount_cents', type: 'int', unique: true })
  amountCents!: number;

  @Column({ name: 'bonus_cents', type: 'int', default: 0 })
  bonusCents!: number;

  @Column({ length: 64, nullable: true })
  label?: string;

  @Column({ type: 'boolean', default: false })
  recommended!: boolean;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
