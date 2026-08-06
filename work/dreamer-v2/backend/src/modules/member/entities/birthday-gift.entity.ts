import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('birthday_gift')
export class BirthdayGift {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ default: false })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
