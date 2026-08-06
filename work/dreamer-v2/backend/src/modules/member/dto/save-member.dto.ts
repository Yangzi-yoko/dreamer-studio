import { IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveMemberDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{4,32}$/)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @Matches(/^\d{2}-\d{2}$/)
  birthday?: string;

  @IsOptional()
  @IsInt()
  levelId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];

  @IsOptional()
  @IsInt()
  status?: number;
}
