import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('referral_relation')
export class ReferralRelation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'referrer_member_id', type: 'int' })
  referrerMemberId!: number;

  @Index({ unique: true })
  @Column({ name: 'invitee_member_id', type: 'int' })
  inviteeMemberId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
