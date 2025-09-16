// Augment Express.Request so req.user is typed
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
      };
    }
  }
}

export {};