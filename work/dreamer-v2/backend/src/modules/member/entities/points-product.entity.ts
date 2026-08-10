import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('point_product')
export class PointsProduct {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  cover?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 0 })
  point!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'total_stock', type: 'int', default: 0 })
  totalStock!: number;

  @Column({ name: 'limit_per_user', type: 'int', default: 0 })
  limitPerUser!: number;

  @Column({ type: 'int', default: 0 })
  exchanged!: number;

  @Column({ length: 10, default: 'enabled' })
  status!: string;

  @Column({ default: 0 })
  sort!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}