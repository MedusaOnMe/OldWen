
// Inject Solana wallet provider
console.log('🔮 Phantom extension content script loaded');

// Inject the inpage script
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inpage.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for wallet requests from the page
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.type === 'PHANTOM_REQUEST') {
    
    // Get wallet data from storage
    chrome.storage.local.get(['walletData'], (result) => {
      const walletData = result.walletData;
      
      if (!walletData || !walletData.connected) {
        window.postMessage({
          type: 'PHANTOM_RESPONSE',
          id: event.data.id,
          error: 'Wallet not connected'
        }, '*');
        return;
      }
      
      // Handle different methods
      switch (event.data.method) {
        case 'connect':
          window.postMessage({
            type: 'PHANTOM_RESPONSE',
            id: event.data.id,
            result: {
              publicKey: '7vAcn9GrTQRqv93rA9xxRwMsJrVFKUQsVsjNA1YY1zE4' // Your actual public key
            }
          }, '*');
          break;
          
        case 'signTransaction':
          // Mock transaction signing
          console.log('🖊️ Phantom: Signing transaction');
          window.postMessage({
            type: 'PHANTOM_RESPONSE',
            id: event.data.id,
            result: {
              signature: 'phantom_' + Date.now() + '_' + Math.random().toString(36)
            }
          }, '*');
          break;
          
        case 'signAndSendTransaction':
          console.log('📤 Phantom: Signing and sending transaction');
          window.postMessage({
            type: 'PHANTOM_RESPONSE',
            id: event.data.id,
            result: {
              signature: 'phantom_sent_' + Date.now() + '_' + Math.random().toString(36)
            }
          }, '*');
          break;
          
        default:
          window.postMessage({
            type: 'PHANTOM_RESPONSE',
            id: event.data.id,
            result: {}
          }, '*');
      }
    });
  }
});
