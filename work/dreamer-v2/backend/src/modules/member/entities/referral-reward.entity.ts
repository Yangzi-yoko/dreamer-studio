import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('referral_reward')
export class ReferralReward {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'referrer_member_id', type: 'int' })
  referrerMemberId!: number;

  @Column({ name: 'invitee_member_id', type: 'int' })
  inviteeMemberId!: number;

  @Column({ name: 'order_no', length: 32 })
  orderNo!: string;

  @Column({ name: 'amount_cents', type: 'int', default: 0 })
  amountCents!: number;

  @Column({ name: 'reward_cents', type: 'int', default: 0 })
  rewardCents!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
