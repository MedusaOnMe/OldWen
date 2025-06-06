
// Phantom wallet provider injected into the page
console.log('👻 Phantom wallet provider injected');

let requestId = 0;
const pendingRequests = new Map();

// Create phantom provider
const phantom = {
  isPhantom: true,
  isConnected: false,
  publicKey: null,
  
  connect: async () => {
    console.log('🔗 Phantom: Connecting...');
    const id = ++requestId;
    
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      
      window.postMessage({
        type: 'PHANTOM_REQUEST',
        id: id,
        method: 'connect'
      }, '*');
      
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  },
  
  disconnect: async () => {
    console.log('❌ Phantom: Disconnecting...');
    phantom.isConnected = false;
    phantom.publicKey = null;
  },
  
  signTransaction: async (transaction) => {
    console.log('🖊️ Phantom: Sign transaction request');
    const id = ++requestId;
    
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      
      window.postMessage({
        type: 'PHANTOM_REQUEST',
        id: id,
        method: 'signTransaction',
        params: { transaction }
      }, '*');
    });
  },
  
  signAndSendTransaction: async (transaction) => {
    console.log('📤 Phantom: Sign and send transaction request');
    const id = ++requestId;
    
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });
      
      window.postMessage({
        type: 'PHANTOM_REQUEST',
        id: id,
        method: 'signAndSendTransaction',
        params: { transaction }
      }, '*');
    });
  },
  
  request: async (method, params) => {
    console.log('📨 Phantom: Request', method, params);
    
    switch (method) {
      case 'connect':
        return phantom.connect();
      case 'disconnect':
        return phantom.disconnect();
      default:
        return {};
    }
  }
};

// Listen for responses
window.addEventListener('message', (event) => {
  if (event.data.type === 'PHANTOM_RESPONSE') {
    const { id, result, error } = event.data;
    const request = pendingRequests.get(id);
    
    if (request) {
      pendingRequests.delete(id);
      
      if (error) {
        request.reject(new Error(error));
      } else {
        // Handle successful connection
        if (result.publicKey) {
          phantom.isConnected = true;
          phantom.publicKey = {
            toString: () => result.publicKey,
            toBase58: () => result.publicKey
          };
        }
        
        request.resolve(result);
      }
    }
  }
});

// Inject into window
window.phantom = { solana: phantom };
window.solana = phantom;

// Trigger ready events
window.dispatchEvent(new Event('phantom#initialized'));
setTimeout(() => {
  window.dispatchEvent(new Event('solana#initialized'));
}, 100);

console.log('✅ Phantom provider ready');
