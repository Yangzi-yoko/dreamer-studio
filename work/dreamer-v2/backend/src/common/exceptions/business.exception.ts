export class BusinessException extends Error {
  constructor(
    message: string,
    public readonly code: number = 10000,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}
