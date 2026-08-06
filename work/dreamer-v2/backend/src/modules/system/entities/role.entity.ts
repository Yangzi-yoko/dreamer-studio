import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { Menu } from './menu.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 64 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToMany(() => AdminUser, (admin) => admin.roles)
  admins!: AdminUser[];

  @ManyToMany(() => Menu, (menu) => menu.roles)
  @JoinTable({ name: 'role_menu' })
  menus!: Menu[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
