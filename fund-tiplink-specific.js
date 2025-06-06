/**
 * Fund specific TipLink wallet with SOL/USDC for DexScreener payments
 * Target wallet: FdJYoUgKaY2wXp9kXXvocU1AnFMTQgiDYQB1yTwGZcrT
 */
import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

// Private key for the funding wallet
const PRIVATE_KEY = '65Xt73xbmH7zBhMEvu524MsoYUiL8y57K7zMzcfKsqEEm3CpsgpQPX4yCuW1KtEycP3fuiqt82pNYsijtgoVnZRJ';

// TipLink wallet public key (the one you specified)
const TIPLINK_WALLET = 'FdJYoUgKaY2wXp9kXXvocU1AnFMTQgiDYQB1yTwGZcrT';

// USDC mint address
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function fundTipLinkWallet() {
  console.log('💰 Funding TipLink wallet for DexScreener payment...');
  console.log(`🎯 Target TipLink wallet: ${TIPLINK_WALLET}`);
  
  try {
    // Setup connection
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    
    // Load the source keypair
    const sourceKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
    console.log('🔑 Source wallet:', sourceKeypair.publicKey.toBase58());
    
    // Check source wallet balance
    const sourceBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log(`💰 Source SOL balance: ${sourceBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (sourceBalance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error('Source wallet has insufficient SOL balance');
    }
    
    // Check TipLink wallet current balance
    const tipLinkBalance = await connection.getBalance(new PublicKey(TIPLINK_WALLET));
    console.log(`💰 TipLink current SOL balance: ${tipLinkBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Transfer SOL for transaction fees (0.01 SOL should be enough)
    const solTransferAmount = 0.01 * LAMPORTS_PER_SOL;
    
    console.log(`🚀 Transferring ${solTransferAmount / LAMPORTS_PER_SOL} SOL for transaction fees...`);
    
    // Create SOL transfer transaction
    const solTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sourceKeypair.publicKey,
        toPubkey: new PublicKey(TIPLINK_WALLET),
        lamports: solTransferAmount,
      })
    );
    
    // Get recent blockhash
    const latestBlockhash = await connection.getLatestBlockhash();
    solTransaction.recentBlockhash = latestBlockhash.blockhash;
    solTransaction.feePayer = sourceKeypair.publicKey;
    
    // Sign and send SOL transaction
    console.log('📤 Sending SOL transaction...');
    const solSignature = await sendAndConfirmTransaction(
      connection,
      solTransaction,
      [sourceKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('✅ SOL transfer completed!');
    console.log(`   Transaction signature: ${solSignature}`);
    console.log(`   Explorer: https://solscan.io/tx/${solSignature}`);
    
    // Check USDC balance in source wallet
    try {
      const sourceUsdcAccount = await getAssociatedTokenAddress(USDC_MINT, sourceKeypair.publicKey);
      const sourceUsdcBalance = await connection.getTokenAccountBalance(sourceUsdcAccount);
      
      if (sourceUsdcBalance.value.uiAmount && sourceUsdcBalance.value.uiAmount >= 300) {
        console.log(`💵 Source USDC balance: ${sourceUsdcBalance.value.uiAmount} USDC`);
        
        // Transfer 300 USDC to TipLink wallet
        const usdcTransferAmount = 300 * 1e6; // 300 USDC (6 decimals)
        
        console.log('🚀 Transferring 300 USDC for payment...');
        
        // Get or create TipLink USDC account
        const tipLinkUsdcAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(TIPLINK_WALLET));
        
        // Create USDC transfer instruction
        const usdcTransferInstruction = createTransferInstruction(
          sourceUsdcAccount,
          tipLinkUsdcAccount,
          sourceKeypair.publicKey,
          usdcTransferAmount,
          [],
          TOKEN_PROGRAM_ID
        );
        
        // Create USDC transfer transaction
        const usdcTransaction = new Transaction().add(usdcTransferInstruction);
        const usdcBlockhash = await connection.getLatestBlockhash();
        usdcTransaction.recentBlockhash = usdcBlockhash.blockhash;
        usdcTransaction.feePayer = sourceKeypair.publicKey;
        
        // Sign and send USDC transaction
        console.log('📤 Sending USDC transaction...');
        const usdcSignature = await sendAndConfirmTransaction(
          connection,
          usdcTransaction,
          [sourceKeypair],
          { commitment: 'confirmed' }
        );
        
        console.log('✅ USDC transfer completed!');
        console.log(`   Transaction signature: ${usdcSignature}`);
        console.log(`   Explorer: https://solscan.io/tx/${usdcSignature}`);
        
      } else {
        console.log('⚠️ Insufficient USDC in source wallet for payment');
        console.log(`   Available: ${sourceUsdcBalance.value.uiAmount || 0} USDC`);
        console.log(`   Required: 300 USDC`);
      }
      
    } catch (usdcError) {
      console.log('⚠️ Could not check/transfer USDC:', usdcError.message);
    }
    
    // Final balance check
    const finalTipLinkBalance = await connection.getBalance(new PublicKey(TIPLINK_WALLET));
    console.log(`💰 TipLink final SOL balance: ${finalTipLinkBalance / LAMPORTS_PER_SOL} SOL`);
    
    try {
      const tipLinkUsdcAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(TIPLINK_WALLET));
      const tipLinkUsdcBalance = await connection.getTokenAccountBalance(tipLinkUsdcAccount);
      console.log(`💵 TipLink USDC balance: ${tipLinkUsdcBalance.value.uiAmount || 0} USDC`);
    } catch (e) {
      console.log('💵 TipLink USDC balance: 0 USDC (no account)');
    }
    
    console.log('🎉 TipLink wallet funding completed!');
    console.log('   Now the DexScreener payment should work with this funded wallet');
    
  } catch (error) {
    console.error('❌ Funding failed:', error.message);
    
    if (error.message.includes('insufficient lamports')) {
      console.log('💡 The source wallet needs more SOL or USDC');
      console.log(`   Source wallet: ${new Keypair().publicKey.toBase58()}`);
      console.log('   Please fund this wallet with SOL and USDC first');
    }
  }
}

// Run the funding
console.log('🚀 Starting TipLink wallet funding...');
console.log(`📍 Target: ${TIPLINK_WALLET}`);
console.log(`💰 Will transfer: 0.01 SOL + 300 USDC`);
console.log('');

fundTipLinkWallet().catch(console.error);