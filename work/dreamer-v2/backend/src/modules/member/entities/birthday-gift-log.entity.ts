import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('birthday_gift_log')
@Index(['memberId', 'couponId', 'giftDate'], { unique: true })
export class BirthdayGiftLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'coupon_id', type: 'int' })
  couponId!: number;

  @Column({ name: 'gift_date', length: 10 })
  giftDate!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
