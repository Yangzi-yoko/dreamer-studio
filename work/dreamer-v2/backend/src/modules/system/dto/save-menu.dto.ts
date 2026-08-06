import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SaveMenuDto {
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsIn(['dir', 'menu', 'button'])
  type!: 'dir' | 'menu' | 'button';

  @IsOptional()
  @IsString()
  permissionCode?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
