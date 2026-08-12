import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_package')
export class UserPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ name: 'package_id', type: 'int' })
  packageId!: number;

  @Column({ name: 'remaining_minutes', type: 'int', default: 0 })
  remainingMinutes!: number;

  @Column({ length: 10, default: 'active' })
  status!: string;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
