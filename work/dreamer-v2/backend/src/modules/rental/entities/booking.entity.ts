import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'booking_no', unique: true, length: 32 })
  bookingNo!: string;

  @Index()
  @Column({ name: 'studio_id', type: 'int' })
  studioId!: number;

  @Column({ name: 'customer_name', length: 64 })
  customerName!: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone!: string;

  @Index()
  @Column({ name: 'booking_date', length: 10 })
  bookingDate!: string;

  @Column({ length: 16, default: 'pending' })
  status!: string;

  @Column({ name: 'slot_count', type: 'int', default: 0 })
  slotCount!: number;

  @Column({ name: 'unit_price_cents', type: 'int', default: 0 })
  unitPriceCents!: number;

  @Column({ name: 'total_amount_cents', type: 'int', default: 0 })
  totalAmountCents!: number;

  @Column({ name: 'discount_cents', type: 'int', default: 0 })
  discountCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ name: 'deposit_refunded', default: false })
  depositRefunded!: boolean;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
