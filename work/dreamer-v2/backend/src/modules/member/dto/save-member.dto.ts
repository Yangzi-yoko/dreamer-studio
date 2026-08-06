import { IsArray, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SaveMemberDto {
  @Matches(/^1\d{10}$/)
  phone!: string;

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
}
