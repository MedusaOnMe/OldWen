import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Use mainnet for all environments
  const network = 'mainnet-beta';
  
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    const rpcEndpoint = import.meta.env.VITE_SOLANA_RPC_URL || 
      import.meta.env.VITE_HELIUS_RPC_ENDPOINT || 
      clusterApiUrl(network);
    
    console.log('[Wallet Context] Network:', network);
    console.log('[Wallet Context] RPC Endpoint:', rpcEndpoint);
    
    return rpcEndpoint;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
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