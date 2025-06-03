# 🔐 WENDEX ADMIN SECURITY GUIDE
## Secure Private Key Access for Manual Operations

---

## ✅ **SECURITY IMPROVEMENTS IMPLEMENTED**

### **🚫 REMOVED: HTTP Private Key Endpoints**
- **DELETED**: `GET /api/admin/campaigns/:id/private-key`
- **RESULT**: Zero network attack surface for private key theft
- **BENEFIT**: Private keys can no longer be intercepted via HTTP

### **🗑️ REMOVED: Client-Side Wallet Code**
- **DELETED**: `client/src/services/wallet.ts` (462 lines)
- **RESULT**: No client-side private key generation capability
- **BENEFIT**: Eliminates browser-based private key theft vectors

### **🛡️ ADDED: Security Middleware**
- **HELMET**: Security headers (CSP, HSTS, XSS protection)
- **CORS**: Cross-origin request protection
- **RATE LIMITING**: API abuse prevention (100 requests/15min, 20 admin requests/15min)

---

## 🔑 **SECURE PRIVATE KEY ACCESS PROCEDURE**

### **When Campaign Reaches $299 Target:**

#### **Step 1: Verify Campaign Status**
```bash
# Check campaign in Firestore console
1. Go to Firebase Console → Firestore Database
2. Navigate to 'campaigns' collection
3. Find campaign by ID
4. Verify status = 'funded' and currentAmount >= 299
```

#### **Step 2: Use Secure Decrypt Script**
```bash
# Run the secure local script
npm run decrypt-wallet CAMPAIGN_ID

# Example output:
🔐 SECURE WALLET DECRYPTION SCRIPT
==================================================
📋 Campaign ID: abc123...
📊 Fetching campaign information...
   Token: ExampleToken (EXMP)
   Status: funded
   Target: $299
   Current: $299.50
   Wallet: 7xKvV8...

🔑 PRIVATE KEY INFORMATION
==================================================
Uint8Array: [45, 123, 78, ...]
Base58: 5Kj8x9Y2...
Hex: 2d7b4e...
```

#### **Step 3: Manual DexScreener Payment**
```typescript
// Use the displayed private key for manual transaction
import { Keypair, Connection, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// Create keypair from decrypted private key
const privateKey = new Uint8Array([/* Uint8Array from script */]);
const keypair = Keypair.fromSecretKey(privateKey);

// Create DexScreener payment transaction
const transaction = new Transaction().add(
  createTransferInstruction(
    fromTokenAccount,    // Campaign wallet USDC account
    dexScreenerAccount,  // DexScreener USDC account  
    keypair.publicKey,
    299 * 1e6,          // 299 USDC (6 decimals)
  )
);

// Sign and send
const signature = await connection.sendTransaction(transaction, [keypair]);

// Clear private key from memory immediately
privateKey.fill(0);
```

#### **Step 4: Update Campaign Status**
```bash
# Mark campaign as completed in admin panel
# Or update directly in Firestore:
# campaigns/{campaignId} → status: 'completed'
```

---

## ⚠️ **SECURITY BEST PRACTICES**

### **Environment Protection**
```bash
# Keep these environment variables secure:
WALLET_ENCRYPTION_KEY=your-32-character-key  # Never share
ADMIN_SECRET_KEY=your-admin-token            # Rotate monthly
FIREBASE_SERVICE_ACCOUNT="{...}"             # Service account JSON

# NEVER commit .env to git
# Store backup copies in secure password manager
```

### **Private Key Handling**
- ✅ **DO**: Use private keys immediately after decryption
- ✅ **DO**: Clear terminal history after script use
- ✅ **DO**: Run script only on secure, local machines
- ❌ **DON'T**: Copy private keys to clipboard or files
- ❌ **DON'T**: Share private keys via chat/email
- ❌ **DON'T**: Leave private keys in terminal output

### **Access Logging**
Every private key access is automatically logged:
```typescript
// Logged to Firestore 'admin_actions' collection
{
  type: 'private_key_decrypt_script',
  campaignId: 'abc123...',
  timestamp: '2024-12-06T...',
  method: 'local_script'
}
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **If Credentials Are Compromised**
```bash
# 1. Rotate encryption key immediately
openssl rand -hex 32 > new-encryption-key.txt
# Update WALLET_ENCRYPTION_KEY in .env

# 2. Change admin secret
openssl rand -hex 32 > new-admin-secret.txt
# Update ADMIN_SECRET_KEY in .env

# 3. Check all campaign wallet balances
npm run decrypt-wallet CAMPAIGN_ID_1
npm run decrypt-wallet CAMPAIGN_ID_2
# Verify no unauthorized transactions

# 4. Monitor Firestore access logs
# Check Firebase Console → Firestore → Usage tab
```

### **If Unauthorized Access Detected**
```bash
# 1. Immediately pause all operations
# 2. Check 'admin_actions' collection for suspicious activity
# 3. Verify campaign wallet balances unchanged
# 4. Rotate ALL credentials
# 5. Enable additional Firebase security rules
```

---

## 📊 **SECURITY BENEFITS ACHIEVED**

### **Before vs After**
| Risk Factor | Before | After |
|-------------|--------|--------|
| HTTP Private Key Exposure | ❌ CRITICAL | ✅ ELIMINATED |
| Client-Side Attack Surface | ❌ HIGH | ✅ ELIMINATED |
| Network Interception | ❌ POSSIBLE | ✅ BLOCKED |
| CORS Attacks | ❌ VULNERABLE | ✅ PROTECTED |
| Rate Limiting | ❌ NONE | ✅ IMPLEMENTED |
| Private Key Logging | ❌ NONE | ✅ COMPREHENSIVE |

### **Attack Vectors Eliminated**
- ✅ HTTP endpoint exploitation
- ✅ Browser developer tools interception  
- ✅ Man-in-the-middle attacks on admin panel
- ✅ Cross-origin request attacks
- ✅ Automated API abuse
- ✅ Client-side private key generation

---

## 🎯 **OPERATIONAL WORKFLOW**

### **Daily Operations**
1. Monitor campaign progress via admin dashboard
2. Receive notifications when campaigns reach targets
3. Use secure script for private key access
4. Execute manual DexScreener payments
5. Update campaign statuses

### **Weekly Security Tasks**
1. Review admin action logs in Firestore
2. Check campaign wallet balances
3. Verify no unauthorized access attempts
4. Backup environment variables securely

### **Monthly Security Tasks**
1. Rotate admin secret key
2. Review and update security procedures
3. Test decrypt script functionality
4. Verify Firebase security rules

---

## 💡 **SCRIPT USAGE EXAMPLES**

### **Basic Usage**
```bash
# Decrypt wallet for campaign
npm run decrypt-wallet abc123def456

# Output includes all necessary information:
# - Campaign details
# - Wallet public key
# - Private key in multiple formats
# - Security warnings
# - Transaction example code
```

### **Error Handling**
```bash
# Campaign not found
npm run decrypt-wallet invalid-id
# Output: ❌ Campaign not found: invalid-id

# Wallet not found  
npm run decrypt-wallet campaign-without-wallet
# Output: ❌ Wallet not found for campaign

# Decryption failure
# Output: ❌ Decryption failed: invalid key or corrupted data
```

---

## 🔒 **ADDITIONAL SECURITY RECOMMENDATIONS**

### **Production Enhancements** (Future)
1. **Multi-Factor Authentication**: Add TOTP for admin panel
2. **IP Whitelisting**: Restrict admin access to specific IPs
3. **Hardware Security Module**: Store encryption keys in HSM
4. **Automated Monitoring**: Real-time alerts for suspicious activity

### **Backup and Recovery**
1. Secure backup of environment variables
2. Disaster recovery procedures documented
3. Test decryption script regularly
4. Maintain offline backup of critical procedures

**This security implementation provides enterprise-grade protection for cryptocurrency assets while maintaining practical operational capabilities.**