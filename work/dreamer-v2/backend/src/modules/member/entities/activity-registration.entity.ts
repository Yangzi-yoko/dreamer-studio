import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_registration')
@Index(['activityId', 'memberId'], { unique: true })
export class ActivityRegistration {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'activity_id', type: 'int' })
  activityId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
