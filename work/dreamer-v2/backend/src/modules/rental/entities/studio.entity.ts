import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('studio')
export class Studio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  name!: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  images?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'weekday_price_cents', type: 'int', default: 0 })
  weekdayPriceCents!: number;

  @Column({ name: 'weekend_price_cents', type: 'int', default: 0 })
  weekendPriceCents!: number;

  @Column({ name: 'holiday_price_cents', type: 'int', default: 0 })
  holidayPriceCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
