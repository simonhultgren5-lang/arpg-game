import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// The project id comes from .env (see .env.example); server.ts loads it with dotenv.
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.warn('FIREBASE_PROJECT_ID is not set in .env, so Google sign-in tokens cannot be verified.');
}

if (!getApps().length) {
  initializeApp(projectId ? { projectId } : {});
}

export const adminAuth = getAuth();
