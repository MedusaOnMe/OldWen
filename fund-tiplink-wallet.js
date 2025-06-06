/**
 * Fund TipLink wallet from the private key wallet
 * This transfers SOL from the main wallet to the TipLink wallet for payments
 */
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Private key for the funding wallet
const PRIVATE_KEY = '65Xt73xbmH7zBhMEvu524MsoYUiL8y57K7zMzcfKsqEEm3CpsgpQPX4yCuW1KtEycP3fuiqt82pNYsijtgoVnZRJ';

// TipLink wallet public key (from the previous run)
const TIPLINK_WALLET = 'APN7bmjqR2U4nkvm1UWe87KSXMVMeNN1sZmpT6VpDYbr';

async function fundTipLinkWallet() {
  console.log('💰 Funding TipLink wallet for DexScreener payment...');
  
  try {
    // Setup connection
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Load the source keypair
    const sourceKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log('🔑 Source wallet:', sourceKeypair.publicKey.toBase58());
    
    // Check source wallet balance
    const sourceBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log(`💰 Source balance: ${sourceBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (sourceBalance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error('Source wallet has insufficient SOL balance');
    }
    
    // Transfer amount (0.005 SOL for transaction fees)
    const transferAmount = 0.005 * LAMPORTS_PER_SOL;
    
    console.log(`🎯 Transferring ${transferAmount / LAMPORTS_PER_SOL} SOL to TipLink wallet...`);
    console.log(`   To: ${TIPLINK_WALLET}`);
    
    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sourceKeypair.publicKey,
        toPubkey: new PublicKey(TIPLINK_WALLET),
        lamports: transferAmount,
      })
    );
    
    // Get recent blockhash
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = sourceKeypair.publicKey;
    
    // Sign and send transaction
    console.log('📤 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sourceKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ Transfer completed!');
    console.log(`   Transaction signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    
    // Check TipLink wallet balance
    const tipLinkBalance = await connection.getBalance(new PublicKey(TIPLINK_WALLET));
    console.log(`💰 TipLink wallet balance: ${tipLinkBalance / LAMPORTS_PER_SOL} SOL`);
    
    console.log('🎉 TipLink wallet funded successfully!');
    console.log('   Now you can proceed with the DexScreener payment automation.');
    
  } catch (error) {
    console.error('❌ Funding failed:', error.message);
  }
}

fundTipLinkWallet().catch(console.error);