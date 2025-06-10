const admin = require('firebase-admin');
require('dotenv').config();

// Configuração do Firebase Admin SDK
const firebaseConfig = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "campneus-dashboard",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// Inicializar Firebase Admin apenas se as credenciais estiverem disponíveis
let firebaseApp;
try {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      projectId: firebaseConfig.project_id
    });
    console.log('Firebase Admin SDK inicializado com sucesso');
  } else {
    console.warn('Credenciais do Firebase não encontradas. Usando modo de desenvolvimento.');
  }
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
}

// Função para verificar token Firebase
const verifyFirebaseToken = async (idToken) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase não inicializado');
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email,
        email_verified: decodedToken.email_verified
      }
    };
  } catch (error) {
    console.error('Erro ao verificar token Firebase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para criar usuário customizado (para desenvolvimento)
const createCustomToken = async (uid) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase não inicializado');
    }
    
    const customToken = await admin.auth().createCustomToken(uid);
    return {
      success: true,
      token: customToken
    };
  } catch (error) {
    console.error('Erro ao criar token customizado:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para obter usuário por UID
const getFirebaseUser = async (uid) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase não inicializado');
    }
    
    const userRecord = await admin.auth().getUser(uid);
    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || userRecord.email,
        email_verified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        created_at: userRecord.metadata.creationTime,
        last_sign_in: userRecord.metadata.lastSignInTime
      }
    };
  } catch (error) {
    console.error('Erro ao buscar usuário Firebase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para listar usuários Firebase (apenas para admin)
const listFirebaseUsers = async (maxResults = 1000) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase não inicializado');
    }
    
    const listUsersResult = await admin.auth().listUsers(maxResults);
    return {
      success: true,
      users: listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email,
        email_verified: user.emailVerified,
        disabled: user.disabled,
        created_at: user.metadata.creationTime,
        last_sign_in: user.metadata.lastSignInTime
      }))
    };
  } catch (error) {
    console.error('Erro ao listar usuários Firebase:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  admin,
  firebaseApp,
  verifyFirebaseToken,
  createCustomToken,
  getFirebaseUser,
  listFirebaseUsers
};

