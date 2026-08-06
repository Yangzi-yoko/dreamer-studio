import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('package_usage')
export class PackageUsage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'user_package_id', type: 'int' })
  userPackageId!: number;

  @Column({ name: 'member_id', type: 'int' })
  memberId!: number;

  @Column({ type: 'int', default: 1 })
  times!: number;

  @Column({ length: 128, nullable: true })
  remark?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
