import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_visible_member')
@Index(['activityId', 'memberId'], { unique: true })
export class ActivityVisibleMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'activity_id', type: 'int' })
  activityId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;
}