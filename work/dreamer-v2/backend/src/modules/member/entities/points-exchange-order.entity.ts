import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('point_exchange_order')
export class PointsExchangeOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_no', length: 32, unique: true })
  orderNo!: string;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @Column({ name: 'product_name', length: 64 })
  productName!: string;

  @Column({ name: 'product_cover', type: 'text', nullable: true })
  productCover?: string;

  @Column({ type: 'int' })
  point!: number;

  @Column({ length: 10, default: 'pending' })
  status!: string;

  @Column({ name: 'receiver_name', length: 32 })
  receiverName!: string;

  @Column({ name: 'receiver_phone', length: 20 })
  receiverPhone!: string;

  @Column({ name: 'receiver_address', length: 255 })
  receiverAddress!: string;

  @Column({ length: 255, nullable: true })
  remark?: string;

  @Column({ name: 'admin_note', length: 255, nullable: true })
  adminNote?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}