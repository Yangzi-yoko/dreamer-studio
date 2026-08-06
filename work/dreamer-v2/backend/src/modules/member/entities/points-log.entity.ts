import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('points_log')
export class PointsLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ length: 8 })
  type!: 'earn' | 'spend';

  @Column({ type: 'int' })
  points!: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
