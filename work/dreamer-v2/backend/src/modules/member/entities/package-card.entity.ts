import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('package_card')
export class PackageCard {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 64 })
  name!: string;

  @Column({ name: 'total_times', type: 'int', default: 0 })
  totalTimes!: number;

  @Column({ name: 'price_cents', type: 'int', default: 0 })
  priceCents!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
