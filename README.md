# Wendex - DexScreener Crowdfunding Platform

A comprehensive crowdfunding platform that enables communities to collectively fund DexScreener marketplace services (Enhanced Token Info, Advertising, Boosts) for cryptocurrency tokens.

## 🚀 Features

- **Campaign Creation**: Create crowdfunding campaigns for any Solana token
- **Wallet Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Real-time Monitoring**: Live balance updates and campaign progress tracking
- **Automated Refunds**: Automatic refunds if campaigns don't reach their targets
- **Service Purchasing**: Automated DexScreener service purchases when funded
- **WebSocket Updates**: Real-time campaign and contribution updates

## 🏗️ Architecture

### Frontend (React + TypeScript)
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- Solana Wallet Adapter integration
- Real-time WebSocket connections
- React Query for data management

### Backend (Express + TypeScript)
- Express.js server with TypeScript
- Firebase Firestore for data storage
- Solana Web3.js for blockchain interactions
- WebSocket for real-time updates
- Automated scheduling for deadline checks

### Blockchain Integration
- Solana mainnet/devnet support
- USDC token handling (SPL Token standard)
- Unique wallet generation per campaign
- Encrypted private key storage
- Transaction verification and monitoring

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, Node.js
- **Database**: Firebase Firestore
- **Blockchain**: Solana, @solana/web3.js, @solana/spl-token
- **Real-time**: WebSockets
- **Wallet**: Solana Wallet Adapter
- **Encryption**: CryptoJS for private key encryption

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wendex
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Fill in your Firebase and Solana configuration
```

4. Start the development server:
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT={}
FIREBASE_PROJECT_ID=your-firebase-project-id

# Solana Configuration
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
# For development: https://api.devnet.solana.com

# Security
WALLET_ENCRYPTION_KEY=your-very-secure-encryption-key

# Client Environment
REACT_APP_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Firebase Setup

1. Create a Firebase project
2. Enable Firestore database
3. Generate a service account key
4. Add the service account JSON to your environment variables

## 🎯 Campaign Types

### Enhanced Token Info ($299)
Add detailed token information, social links, and descriptions to DexScreener.

### Token Advertising (Custom Budget)
Promote tokens with banner ads and featured placements on DexScreener.

### DexScreener Boost (Variable Pricing)
Boost token visibility with trending placement and increased exposure.

## 🔄 Campaign Lifecycle

1. **Creation**: User creates campaign with target amount and deadline
2. **Funding**: Community contributes USDC to unique campaign wallet
3. **Monitoring**: Real-time balance tracking and progress updates
4. **Completion**: 
   - **Success**: Automatic service purchase when target reached
   - **Failure**: Automatic refunds if deadline passes without target

## 📡 API Endpoints

### Campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns` - List campaigns with filters
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/contribute` - Record contribution
- `GET /api/campaigns/:id/contributions` - Get campaign contributions

### Balances
- `GET /api/balances/:wallet` - Get wallet USDC balance
- `GET /api/transactions/:wallet` - Get transaction history

### WebSocket Events
- `campaign_update` - Campaign status/amount changes
- `new_contribution` - New contribution received

## 🔒 Security Features

- Encrypted private key storage using AES-256
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure token transfer verification
- Multi-signature admin controls (planned)

## 🚦 Campaign States

- **Active**: Accepting contributions, deadline not reached
- **Funded**: Target reached, pending service purchase
- **Completed**: Service purchased and confirmed
- **Failed**: Deadline passed, target not reached
- **Refunding**: Processing refunds to contributors
- **Cancelled**: Manually cancelled by admin

## 📈 Monitoring & Analytics

- Real-time campaign progress tracking
- Contribution history and analytics
- Transaction monitoring and verification
- Platform-wide statistics and metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This platform handles cryptocurrency transactions. Users should:
- Understand the risks involved in cryptocurrency investments
- Verify all campaign information before contributing
- Be aware that refunds depend on campaign wallet balances
- Use testnet for development and testing

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.