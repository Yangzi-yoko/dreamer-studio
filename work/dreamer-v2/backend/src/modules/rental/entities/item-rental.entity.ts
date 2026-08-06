import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('item_rental')
export class ItemRental {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'rental_no', unique: true, length: 32 })
  rentalNo!: string;

  @Index()
  @Column({ name: 'item_id', type: 'int' })
  itemId!: number;

  @Column({ name: 'customer_name', length: 64 })
  customerName!: string;

  @Column({ name: 'customer_phone', length: 20 })
  customerPhone!: string;

  @Column({ name: 'billing_type', length: 8, default: 'day' })
  billingType!: 'day' | 'slot';

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Index()
  @Column({ name: 'start_date', length: 10 })
  startDate!: string;

  @Column({ name: 'end_date', length: 10 })
  endDate!: string;

  @Column({ name: 'slot_count', type: 'int', default: 0 })
  slotCount!: number;

  @Column({ name: 'unit_price_cents', type: 'int', default: 0 })
  unitPriceCents!: number;

  @Column({ name: 'total_amount_cents', type: 'int', default: 0 })
  totalAmountCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ name: 'deposit_refunded', default: false })
  depositRefunded!: boolean;

  @Column({ name: 'damage_deduct_cents', type: 'int', default: 0 })
  damageDeductCents!: number;

  @Column({ length: 16, default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
