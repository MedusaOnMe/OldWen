
let walletData = null;

function showWelcome() {
  document.getElementById('welcome-screen').classList.remove('hidden');
  document.getElementById('import-screen').classList.add('hidden');
  document.getElementById('wallet-screen').classList.add('hidden');
}

function showImport() {
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('import-screen').classList.remove('hidden');
  document.getElementById('wallet-screen').classList.add('hidden');
}

function createWallet() {
  alert('Create wallet not implemented in this test version');
}

function importWallet() {
  const privateKey = document.getElementById('private-key').value.trim();
  const password = document.getElementById('password').value;
  
  if (!privateKey || !password) {
    document.getElementById('status').innerHTML = '<div class="error">Please fill all fields</div>';
    return;
  }
  
  try {
    // Store wallet data
    walletData = {
      privateKey: privateKey,
      password: password,
      connected: true
    };
    
    // Store in chrome storage
    chrome.storage.local.set({ walletData: walletData }, () => {
      console.log('Wallet imported successfully');
      showWalletScreen();
    });
    
  } catch (error) {
    document.getElementById('status').innerHTML = '<div class="error">Invalid private key</div>';
  }
}

function showWalletScreen() {
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('import-screen').classList.add('hidden');
  document.getElementById('wallet-screen').classList.remove('hidden');
  
  if (walletData) {
    // Show truncated public key (derived from private key)
    document.getElementById('public-key').textContent = 'Connected';
  }
}

function signTransaction() {
  console.log('Signing transaction...');
  document.getElementById('status').innerHTML = '<div class="connected">Transaction signed!</div>';
}

function disconnect() {
  walletData = null;
  chrome.storage.local.remove('walletData');
  showWelcome();
}

// Load saved wallet on startup
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['walletData'], (result) => {
    if (result.walletData) {
      walletData = result.walletData;
      showWalletScreen();
    }
  });
});
