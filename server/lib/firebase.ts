import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

// Load environment variables before Firebase initialization
dotenv.config();

let app;

try {
  // Try to use service account if provided
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  console.log('[Firebase Init] serviceAccountJson exists:', !!serviceAccountJson);
  console.log('[Firebase Init] projectId:', projectId);

  if (serviceAccountJson && projectId) {
    console.log('[Firebase Init] Parsing service account JSON...');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    console.log('[Firebase Init] Service account parsed, project_id:', serviceAccount.project_id);
    
    // Ensure service account has required fields
    if (!serviceAccount.project_id) {
      serviceAccount.project_id = projectId;
    }
    
    console.log('[Firebase Init] Initializing Firebase app...');
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId
    });
    console.log('Connected to Firebase project:', projectId);
  } else {
    // Fallback for development - use a mock/in-memory setup
    console.warn('Firebase credentials not configured - using development mode');
    
    // Create a mock implementation for development
    const mockFirestore = {
      collection: (name: string) => ({
        doc: (id?: string) => ({
          id: id || Math.random().toString(36).substr(2, 9),
          get: async () => ({ exists: false, data: () => null }),
          set: async (data: any) => console.log(`Mock set ${name}/${id}:`, data),
          update: async (data: any) => console.log(`Mock update ${name}/${id}:`, data),
          delete: async () => console.log(`Mock delete ${name}/${id}`)
        }),
        add: async (data: any) => {
          const id = Math.random().toString(36).substr(2, 9);
          console.log(`Mock add ${name}/${id}:`, data);
          return { id };
        },
        where: (field: string, op: string, value: any) => ({
          get: async () => ({ docs: [], empty: true, size: 0 }),
          limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
          orderBy: (field: string, direction?: string) => ({ 
            get: async () => ({ docs: [], empty: true, size: 0 }),
            limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) })
          }),
          where: (field: string, op: string, value: any) => ({
            get: async () => ({ docs: [], empty: true, size: 0 })
          })
        }),
        orderBy: (field: string, direction?: string) => ({ 
          get: async () => ({ docs: [], empty: true, size: 0 }),
          limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
          where: (field: string, op: string, value: any) => ({
            get: async () => ({ docs: [], empty: true, size: 0 })
          })
        }),
        get: async () => ({ docs: [], empty: true, size: 0 }),
        onSnapshot: (callback: any) => {
          console.log(`Mock onSnapshot for ${name}`);
          return () => console.log(`Mock unsubscribe for ${name}`);
        }
      })
    };

    // Export mock db for development
    (global as any).mockDb = mockFirestore;
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Create mock for development
  const mockFirestore = {
    collection: (name: string) => ({
      doc: (id?: string) => ({
        id: id || Math.random().toString(36).substr(2, 9),
        get: async () => ({ exists: false, data: () => null }),
        set: async (data: any) => console.log(`Mock set ${name}/${id}:`, data),
        update: async (data: any) => console.log(`Mock update ${name}/${id}:`, data),
        delete: async () => console.log(`Mock delete ${name}/${id}`)
      }),
      add: async (data: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        console.log(`Mock add ${name}/${id}:`, data);
        return { id };
      },
      where: (field: string, op: string, value: any) => ({
        get: async () => ({ docs: [], empty: true, size: 0 }),
        limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
        orderBy: (field: string, direction?: string) => ({ 
          get: async () => ({ docs: [], empty: true, size: 0 }),
          limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) })
        }),
        where: (field: string, op: string, value: any) => ({
          get: async () => ({ docs: [], empty: true, size: 0 })
        })
      }),
      orderBy: (field: string, direction?: string) => ({ 
        get: async () => ({ docs: [], empty: true, size: 0 }),
        limit: (n: number) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
        where: (field: string, op: string, value: any) => ({
          get: async () => ({ docs: [], empty: true, size: 0 })
        })
      }),
      get: async () => ({ docs: [], empty: true, size: 0 }),
      onSnapshot: (callback: any) => {
        console.log(`Mock onSnapshot for ${name}`);
        return () => console.log(`Mock unsubscribe for ${name}`);
      }
    })
  };

  (global as any).mockDb = mockFirestore;
}

export const db = app ? getFirestore(app) : (global as any).mockDb;
export const auth = app ? getAuth(app) : null;

export const collections = {
  campaigns: 'campaigns',
  contributions: 'contributions',
  transactions: 'transactions',
  services: 'services',
  refunds: 'refunds',
  wallets: 'wallets'
};