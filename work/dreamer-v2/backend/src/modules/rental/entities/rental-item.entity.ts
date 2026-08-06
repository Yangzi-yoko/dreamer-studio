import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rental_item')
export class RentalItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  images?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'billing_type', length: 8, default: 'day' })
  billingType!: 'day' | 'slot';

  @Column({ name: 'unit_price_cents', type: 'int', default: 0 })
  unitPriceCents!: number;

  @Column({ name: 'deposit_cents', type: 'int', default: 0 })
  depositCents!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
