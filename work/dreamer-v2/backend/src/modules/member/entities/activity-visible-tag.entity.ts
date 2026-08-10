import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_visible_tag')
@Index(['activityId', 'tagId'], { unique: true })
export class ActivityVisibleTag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'activity_id', type: 'int' })
  activityId!: number;

  @Column({ name: 'tag_id', type: 'int' })
  tagId!: number;
}