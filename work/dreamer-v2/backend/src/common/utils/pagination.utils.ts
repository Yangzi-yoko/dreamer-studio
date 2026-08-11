import { BusinessException } from '../exceptions/business.exception';

const MAX_PAGE_SIZE = 100;

export function assertPagination(page: number, pageSize: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new BusinessException('分页参数非法：page 必须为不小于 1 的整数', 40010);
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new BusinessException(`分页参数非法：pageSize 必须在 1-${MAX_PAGE_SIZE} 之间`, 40011);
  }
}