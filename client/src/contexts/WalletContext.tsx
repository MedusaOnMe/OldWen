import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Use mainnet for all environments
  const network = 'mainnet-beta';
  
  // Use Helius RPC endpoint for all wallet operations
  const endpoint = useMemo(() => {
    // Use the same Helius RPC that the server uses for consistency
    const rpcEndpoint = 'https://mainnet.helius-rpc.com/?api-key=8e3b6efc-5c17-4baf-9eef-ec5ef39f02d5';
    
    console.log('[Wallet Context] Network:', network);
    console.log('[Wallet Context] RPC Endpoint:', rpcEndpoint);
    
    return rpcEndpoint;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};