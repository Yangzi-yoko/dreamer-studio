import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('member_signin_log')
@Index(['memberId', 'signinDate'], { unique: true })
export class SigninLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'signin_date', length: 10 })
  signinDate!: string;

  @Column({ type: 'int', default: 1 })
  streak!: number;

  @Column({ name: 'points_awarded', type: 'int', default: 0 })
  pointsAwarded!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
