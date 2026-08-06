import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('booking_time_slot')
export class BookingTimeSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'booking_id', type: 'int' })
  bookingId!: number;

  @Index()
  @Column({ name: 'time_slot_id', type: 'int' })
  timeSlotId!: number;

  @Column({ name: 'start_time', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', length: 5 })
  endTime!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
