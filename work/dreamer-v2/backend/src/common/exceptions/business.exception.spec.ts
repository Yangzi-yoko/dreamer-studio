import { BusinessException } from './business.exception';

describe('BusinessException', () => {
  it('defaults code to 10000', () => {
    const e = new BusinessException('库存不足');
    expect(e.code).toBe(10000);
    expect(e.message).toBe('库存不足');
  });

  it('accepts custom code', () => {
    const e = new BusinessException('已超时', 40001);
    expect(e.code).toBe(40001);
  });
});
