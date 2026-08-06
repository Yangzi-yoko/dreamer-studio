import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('admin_user')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 64 })
  username!: string;

  @Column({ name: 'password_hash', length: 128 })
  passwordHash!: string;

  @Column({ length: 64 })
  nickname!: string;

  @Column({ name: 'is_super', default: false })
  isSuper!: boolean;

  @Column({ default: 1 })
  status!: number;

  @ManyToMany(() => Role, (role) => role.admins)
  @JoinTable({ name: 'admin_role' })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
