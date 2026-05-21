import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    user?: { id: number; role: 'admin' | 'sales' };
  }
}
