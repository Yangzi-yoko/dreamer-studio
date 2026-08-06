import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity('menu')
export class Menu {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: number;

  @Column({ length: 64 })
  title!: string;

  @Column({ length: 255, nullable: true })
  path?: string;

  @Column({ length: 64, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 16, default: 'menu' })
  type!: 'dir' | 'menu' | 'button';

  @Column({ name: 'permission_code', unique: true, length: 128, nullable: true })
  permissionCode?: string;

  @Column({ default: 0 })
  sort!: number;

  @Column({ default: true })
  visible!: boolean;

  @ManyToMany(() => Role, (role) => role.menus)
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
