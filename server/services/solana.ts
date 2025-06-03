import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { db, collections } from '../lib/firebase.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_ENDPOINT = process.env.HELIUS_RPC_ENDPOINT 
  ? `${process.env.HELIUS_RPC_ENDPOINT}${HELIUS_API_KEY}`
  : `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;
const FALLBACK_RPC = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'development_encryption_key_32_chars') {
  throw new Error('WALLET_ENCRYPTION_KEY must be set to a secure 32-byte hex string');
}

// Determine which RPC to use
const getRpcEndpoint = () => {
  if (HELIUS_API_KEY && HELIUS_API_KEY !== 'dev_key_placeholder') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Helius connection initialized');
    }
    return HELIUS_RPC_ENDPOINT;
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using fallback RPC connection');
    }
    return FALLBACK_RPC;
  }
};

// Primary connection using Helius for enhanced performance
export const connection = new Connection(getRpcEndpoint(), 'confirmed');

// Fallback connection for redundancy
export const fallbackConnection = new Connection(FALLBACK_RPC, 'confirmed');

export interface WalletInfo {
  publicKey: string;
  encryptedPrivateKey: string;
  campaignId: string;
  createdAt: Date;
}

export async function generateCampaignWallet(campaignId: string): Promise<WalletInfo> {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  
  const privateKeyBytes = keypair.secretKey;
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
  const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKeyHex, ENCRYPTION_KEY).toString();
  
  const walletInfo: WalletInfo = {
    publicKey,
    encryptedPrivateKey,
    campaignId,
    createdAt: new Date()
  };
  
  await db.collection(collections.wallets).doc(campaignId).set(walletInfo);
  
  return walletInfo;
}

export async function decryptPrivateKey(encryptedKey: string): Promise<Keypair> {
  const decryptedHex = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  const privateKeyBytes = Buffer.from(decryptedHex, 'hex');
  return Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
}

// Admin function to get private key for manual DexScreener payments
export async function getPrivateKeyForAdmin(campaignId: string): Promise<string> {
  const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
  if (!walletDoc.exists) {
    throw new Error('Campaign wallet not found');
  }
  
  const walletData = walletDoc.data() as WalletInfo;
  const decryptedHex = CryptoJS.AES.decrypt(walletData.encryptedPrivateKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  
  // Log access for security audit
  console.log(`[SECURITY] Private key accessed for campaign ${campaignId} at ${new Date().toISOString()}`);
  
  return decryptedHex;
}

export async function getUSDCBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
    
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount) / 1e6; // USDC has 6 decimals
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return 0;
  }
}

export async function monitorWalletBalance(walletAddress: string, onBalanceChange: (balance: number) => void) {
  const publicKey = new PublicKey(walletAddress);
  const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
  
  let subscriptionId = connection.onAccountChange(
    tokenAccount,
    async (accountInfo) => {
      try {
        const balance = await getUSDCBalance(walletAddress);
        onBalanceChange(balance);
      } catch (error) {
        console.error('Error monitoring balance:', error);
      }
    },
    'confirmed'
  );
  
  return () => {
    connection.removeAccountChangeListener(subscriptionId);
  };
}

export async function getTransactionHistory(walletAddress: string, limit = 20) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        return {
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime,
          transaction: tx
        };
      })
    );
    
    return transactions;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
}