// Node 18 compatibility: @nestjs/typeorm references global crypto.randomUUID
// which is not available as a global on Node 18.
import { randomUUID } from 'crypto';

if (typeof (globalThis as any).crypto?.randomUUID !== 'function') {
  (globalThis as any).crypto = { ...(globalThis as any).crypto, randomUUID };
}
