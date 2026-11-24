import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/repository.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@unknown.local`,
      typeof decodedToken.name === 'string' ? decodedToken.name : null
    );
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying authentication or syncing user:', error);
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
};
