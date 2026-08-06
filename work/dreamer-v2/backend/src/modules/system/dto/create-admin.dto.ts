import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nickname!: string;

  @IsBoolean()
  @IsOptional()
  isSuper?: boolean;

  @IsArray()
  @IsOptional()
  roleIds?: number[];
}
