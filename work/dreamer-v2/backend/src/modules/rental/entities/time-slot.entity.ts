import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('time_slot')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'studio_id', type: 'int' })
  studioId!: number;

  @Column({ name: 'start_time', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', length: 5 })
  endTime!: string;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
