/**
 * DexScreener Payment Handler - Replit Compatible
 * Handles automated payments without browser wallet extensions
 */
import { Connection, Keypair, Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { decryptPrivateKey } from './solana.js';

export interface PaymentResult {
  success: boolean;
  signature?: string;
  error?: string;
  txHash?: string;
}

export class DexScreenerPaymentHandler {
  private connection: Connection;
  private dexScreenerWallet: PublicKey;
  private usdcMint: PublicKey;
  
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // DexScreener's payment wallet (you'll need to find their actual address)
    this.dexScreenerWallet = new PublicKey(
      process.env.DEXSCREENER_PAYMENT_WALLET || 'DexScreenerWalletAddressHere'
    );
    
    // USDC mint address
    this.usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  /**
   * Pay for DexScreener service BEFORE form submission
   * This is the most reliable method
   */
  async payForService(
    serviceType: 'enhanced_token_info' | 'advertising' | 'boost',
    customAmount?: number
  ): Promise<PaymentResult> {
    try {
      console.log(`💰 Processing payment for ${serviceType}...`);
      
      // Get service price
      const amount = customAmount || this.getServicePrice(serviceType);
      
      // Load payment wallet
      const payerKeypair = await this.loadPaymentWallet();
      
      // Create payment transaction
      const transaction = await this.createPaymentTransaction(payerKeypair, amount);
      
      // Send transaction
      const signature = await this.connection.sendAndConfirmTransaction(
        transaction, 
        [payerKeypair],
        { commitment: 'confirmed', maxRetries: 3 }
      );
      
      console.log(`✅ Payment successful: ${signature}`);
      
      // Verify transaction
      const txInfo = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });
      
      if (!txInfo) {
        throw new Error('Transaction not found after confirmation');
      }
      
      return {
        success: true,
        signature,
        txHash: signature
      };
      
    } catch (error) {
      console.error('❌ Payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Create USDC payment transaction
   */
  private async createPaymentTransaction(
    payer: Keypair, 
    amountUSD: number
  ): Promise<Transaction> {
    
    // Convert USD to USDC (6 decimals)
    const amountUSDC = Math.floor(amountUSD * 1_000_000);
    
    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      payer.publicKey
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      this.dexScreenerWallet
    );
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        payer.publicKey,
        amountUSDC,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // Set recent blockhash and fee payer
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
    // Sign transaction
    transaction.sign(payer);
    
    return transaction;
  }

  /**
   * Load encrypted payment wallet
   */
  private async loadPaymentWallet(): Promise<Keypair> {
    try {
      const encryptedWallet = process.env.ENCRYPTED_DEXSCREENER_WALLET;
      const password = process.env.WALLET_ENCRYPTION_PASSWORD;
      
      if (!encryptedWallet || !password) {
        throw new Error('Payment wallet credentials not found in environment');
      }
      
      // Use your existing decryption function
      const decryptedPrivateKey = await decryptPrivateKey(encryptedWallet, password);
      
      // Convert hex string to Uint8Array
      const privateKeyBytes = new Uint8Array(
        decryptedPrivateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      
      return Keypair.fromSecretKey(privateKeyBytes);
      
    } catch (error) {
      throw new Error(`Failed to load payment wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get service pricing
   */
  private getServicePrice(serviceType: string): number {
    const prices = {
      'enhanced_token_info': 299,  // $299 USD
      'advertising': 500,          // Variable, default $500
      'boost': 100                 // Variable, default $100
    };
    
    return prices[serviceType as keyof typeof prices] || 299;
  }

  /**
   * Verify payment was successful
   */
  async verifyPayment(signature: string): Promise<boolean> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      });
      
      return transaction !== null && transaction.meta?.err === null;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  /**
   * Check wallet balance
   */
  async checkWalletBalance(): Promise<{
    sol: number;
    usdc: number;
    walletAddress: string;
  }> {
    try {
      const payerKeypair = await this.loadPaymentWallet();
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(payerKeypair.publicKey);
      
      // Get USDC balance
      const usdcTokenAccount = await getAssociatedTokenAddress(
        this.usdcMint,
        payerKeypair.publicKey
      );
      
      let usdcBalance = 0;
      try {
        const tokenAccountInfo = await this.connection.getTokenAccountBalance(usdcTokenAccount);
        usdcBalance = tokenAccountInfo.value.uiAmount || 0;
      } catch (error) {
        // USDC account might not exist
        console.log('USDC account not found or empty');
      }
      
      return {
        sol: solBalance / 1_000_000_000, // Convert lamports to SOL
        usdc: usdcBalance,
        walletAddress: payerKeypair.publicKey.toBase58()
      };
      
    } catch (error) {
      throw new Error(`Failed to check wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const dexScreenerPaymentHandler = new DexScreenerPaymentHandler();