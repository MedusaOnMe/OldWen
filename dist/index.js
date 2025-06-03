var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/lib/firebase.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";
var app, db, auth, collections;
var init_firebase = __esm({
  "server/lib/firebase.ts"() {
    "use strict";
    dotenv.config();
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      const projectId = process.env.FIREBASE_PROJECT_ID;
      console.log("[Firebase Init] serviceAccountJson exists:", !!serviceAccountJson);
      console.log("[Firebase Init] projectId:", projectId);
      if (serviceAccountJson && projectId) {
        console.log("[Firebase Init] Parsing service account JSON...");
        const serviceAccount = JSON.parse(serviceAccountJson);
        console.log("[Firebase Init] Service account parsed, project_id:", serviceAccount.project_id);
        if (!serviceAccount.project_id) {
          serviceAccount.project_id = projectId;
        }
        console.log("[Firebase Init] Initializing Firebase app...");
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId
        });
        console.log("Connected to Firebase project:", projectId);
      } else {
        console.warn("Firebase credentials not configured - using development mode");
        const mockFirestore = {
          collection: (name) => ({
            doc: (id) => ({
              id: id || Math.random().toString(36).substr(2, 9),
              get: async () => ({ exists: false, data: () => null }),
              set: async (data) => console.log(`Mock set ${name}/${id}:`, data),
              update: async (data) => console.log(`Mock update ${name}/${id}:`, data),
              delete: async () => console.log(`Mock delete ${name}/${id}`)
            }),
            add: async (data) => {
              const id = Math.random().toString(36).substr(2, 9);
              console.log(`Mock add ${name}/${id}:`, data);
              return { id };
            },
            where: (field, op, value) => ({
              get: async () => ({ docs: [], empty: true, size: 0 }),
              limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
              orderBy: (field2, direction) => ({
                get: async () => ({ docs: [], empty: true, size: 0 }),
                limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) })
              }),
              where: (field2, op2, value2) => ({
                get: async () => ({ docs: [], empty: true, size: 0 })
              })
            }),
            orderBy: (field, direction) => ({
              get: async () => ({ docs: [], empty: true, size: 0 }),
              limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
              where: (field2, op, value) => ({
                get: async () => ({ docs: [], empty: true, size: 0 })
              })
            }),
            get: async () => ({ docs: [], empty: true, size: 0 }),
            onSnapshot: (callback) => {
              console.log(`Mock onSnapshot for ${name}`);
              return () => console.log(`Mock unsubscribe for ${name}`);
            }
          })
        };
        global.mockDb = mockFirestore;
      }
    } catch (error) {
      console.error("Firebase initialization error:", error);
      const mockFirestore = {
        collection: (name) => ({
          doc: (id) => ({
            id: id || Math.random().toString(36).substr(2, 9),
            get: async () => ({ exists: false, data: () => null }),
            set: async (data) => console.log(`Mock set ${name}/${id}:`, data),
            update: async (data) => console.log(`Mock update ${name}/${id}:`, data),
            delete: async () => console.log(`Mock delete ${name}/${id}`)
          }),
          add: async (data) => {
            const id = Math.random().toString(36).substr(2, 9);
            console.log(`Mock add ${name}/${id}:`, data);
            return { id };
          },
          where: (field, op, value) => ({
            get: async () => ({ docs: [], empty: true, size: 0 }),
            limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
            orderBy: (field2, direction) => ({
              get: async () => ({ docs: [], empty: true, size: 0 }),
              limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) })
            }),
            where: (field2, op2, value2) => ({
              get: async () => ({ docs: [], empty: true, size: 0 })
            })
          }),
          orderBy: (field, direction) => ({
            get: async () => ({ docs: [], empty: true, size: 0 }),
            limit: (n) => ({ get: async () => ({ docs: [], empty: true, size: 0 }) }),
            where: (field2, op, value) => ({
              get: async () => ({ docs: [], empty: true, size: 0 })
            })
          }),
          get: async () => ({ docs: [], empty: true, size: 0 }),
          onSnapshot: (callback) => {
            console.log(`Mock onSnapshot for ${name}`);
            return () => console.log(`Mock unsubscribe for ${name}`);
          }
        })
      };
      global.mockDb = mockFirestore;
    }
    db = app ? getFirestore(app) : global.mockDb;
    auth = app ? getAuth(app) : null;
    collections = {
      campaigns: "campaigns",
      contributions: "contributions",
      transactions: "transactions",
      services: "services",
      refunds: "refunds",
      wallets: "wallets"
    };
  }
});

// server/services/solana.ts
var solana_exports = {};
__export(solana_exports, {
  connection: () => connection,
  decryptPrivateKey: () => decryptPrivateKey,
  fallbackConnection: () => fallbackConnection,
  generateCampaignWallet: () => generateCampaignWallet,
  getPrivateKeyForAdmin: () => getPrivateKeyForAdmin,
  getTransactionHistory: () => getTransactionHistory,
  getUSDCBalance: () => getUSDCBalance,
  monitorWalletBalance: () => monitorWalletBalance
});
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import CryptoJS from "crypto-js";
async function generateCampaignWallet(campaignId) {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKeyBytes = keypair.secretKey;
  const privateKeyHex = Buffer.from(privateKeyBytes).toString("hex");
  const encryptedPrivateKey = CryptoJS.AES.encrypt(privateKeyHex, ENCRYPTION_KEY).toString();
  const walletInfo = {
    publicKey,
    encryptedPrivateKey,
    campaignId,
    createdAt: /* @__PURE__ */ new Date()
  };
  await db.collection(collections.wallets).doc(campaignId).set(walletInfo);
  return walletInfo;
}
async function decryptPrivateKey(encryptedKey) {
  const decryptedHex = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  const privateKeyBytes = Buffer.from(decryptedHex, "hex");
  return Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));
}
async function getPrivateKeyForAdmin(campaignId) {
  const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
  if (!walletDoc.exists) {
    throw new Error("Campaign wallet not found");
  }
  const walletData = walletDoc.data();
  const decryptedHex = CryptoJS.AES.decrypt(walletData.encryptedPrivateKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  console.log(`[SECURITY] Private key accessed for campaign ${campaignId} at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  return decryptedHex;
}
async function getUSDCBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount) / 1e6;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return 0;
  }
}
async function monitorWalletBalance(walletAddress, onBalanceChange) {
  const publicKey = new PublicKey(walletAddress);
  const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
  let subscriptionId = connection.onAccountChange(
    tokenAccount,
    async (accountInfo) => {
      try {
        const balance = await getUSDCBalance(walletAddress);
        onBalanceChange(balance);
      } catch (error) {
        console.error("Error monitoring balance:", error);
      }
    },
    "confirmed"
  );
  return () => {
    connection.removeAccountChangeListener(subscriptionId);
  };
}
async function getTransactionHistory(walletAddress, limit = 20) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        return {
          signature: sig.signature,
          slot: sig.slot,
          timestamp: sig.blockTime,
          transaction: tx
        };
      })
    );
    return transactions;
  } catch (error) {
    console.error("Error getting transaction history:", error);
    return [];
  }
}
var USDC_MINT, HELIUS_API_KEY, HELIUS_RPC_ENDPOINT, FALLBACK_RPC, ENCRYPTION_KEY, getRpcEndpoint, connection, fallbackConnection;
var init_solana = __esm({
  "server/services/solana.ts"() {
    "use strict";
    init_firebase();
    USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    HELIUS_RPC_ENDPOINT = process.env.HELIUS_RPC_ENDPOINT ? `${process.env.HELIUS_RPC_ENDPOINT}${HELIUS_API_KEY}` : `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`;
    FALLBACK_RPC = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";
    ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY === "development_encryption_key_32_chars") {
      throw new Error("WALLET_ENCRYPTION_KEY must be set to a secure 32-byte hex string");
    }
    getRpcEndpoint = () => {
      console.log("HELIUS_API_KEY value:", HELIUS_API_KEY);
      if (HELIUS_API_KEY && HELIUS_API_KEY !== "dev_key_placeholder") {
        console.log("Using Helius RPC:", HELIUS_RPC_ENDPOINT);
        return HELIUS_RPC_ENDPOINT;
      } else {
        console.log("HELIUS_API_KEY not configured - using fallback RPC:", FALLBACK_RPC);
        return FALLBACK_RPC;
      }
    };
    connection = new Connection(getRpcEndpoint(), "confirmed");
    fallbackConnection = new Connection(FALLBACK_RPC, "confirmed");
  }
});

// server/services/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
function initializeWebSocket(server) {
  wsService = new WebSocketService(server);
  return wsService;
}
var WebSocketService, wsService;
var init_websocket = __esm({
  "server/services/websocket.ts"() {
    "use strict";
    init_firebase();
    WebSocketService = class {
      wss;
      clients = /* @__PURE__ */ new Map();
      constructor(server) {
        this.wss = new WebSocketServer({ server, path: "/ws" });
        this.setupWebSocketServer();
        this.setupFirestoreListeners();
      }
      setupWebSocketServer() {
        this.wss.on("connection", (ws, req) => {
          const clientId = Math.random().toString(36).substring(7);
          const client = {
            ws,
            subscriptions: /* @__PURE__ */ new Set()
          };
          this.clients.set(clientId, client);
          console.log(`WebSocket client connected: ${clientId}`);
          ws.on("message", (data) => {
            try {
              const message = JSON.parse(data.toString());
              this.handleMessage(clientId, message);
            } catch (error) {
              console.error("WebSocket message error:", error);
            }
          });
          ws.on("close", () => {
            this.clients.delete(clientId);
            console.log(`WebSocket client disconnected: ${clientId}`);
          });
          ws.on("error", (error) => {
            console.error(`WebSocket error for client ${clientId}:`, error);
          });
          ws.send(JSON.stringify({ type: "connected", clientId }));
        });
      }
      handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;
        switch (message.type) {
          case "subscribe":
            if (message.campaignId) {
              client.subscriptions.add(message.campaignId);
              console.log(`Client ${clientId} subscribed to campaign ${message.campaignId}`);
            }
            break;
          case "unsubscribe":
            if (message.campaignId) {
              client.subscriptions.delete(message.campaignId);
              console.log(`Client ${clientId} unsubscribed from campaign ${message.campaignId}`);
            }
            break;
          case "ping":
            client.ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      }
      setupFirestoreListeners() {
        db.collection(collections.campaigns).onSnapshot((snapshot) => {
          console.log("Real-time campaigns listener: received", snapshot.size, "documents");
          snapshot.docChanges().forEach((change) => {
            const campaign = { id: change.doc.id, ...change.doc.data() };
            if (change.type === "modified" || change.type === "added") {
              this.broadcastToCampaignSubscribers(campaign.id, {
                type: "campaign_update",
                campaign
              });
            }
          });
        });
        db.collection(collections.contributions).onSnapshot((snapshot) => {
          console.log("Real-time contributions listener: received", snapshot.size, "documents");
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const contribution = { id: change.doc.id, ...change.doc.data() };
              this.broadcastToCampaignSubscribers(contribution.campaignId, {
                type: "new_contribution",
                contribution
              });
            }
          });
        });
      }
      broadcastToCampaignSubscribers(campaignId, data) {
        this.clients.forEach((client) => {
          if (client.subscriptions.has(campaignId) && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
          }
        });
      }
      broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach((client) => {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(message);
          }
        });
      }
    };
  }
});

// server/services/DexScreenerService.ts
var DexScreenerService_exports = {};
__export(DexScreenerService_exports, {
  DexScreenerService: () => DexScreenerService,
  dexScreenerService: () => dexScreenerService
});
import axios2 from "axios";
import { PublicKey as PublicKey4, Transaction as Transaction2, sendAndConfirmTransaction as sendAndConfirmTransaction2 } from "@solana/web3.js";
import { getAssociatedTokenAddress as getAssociatedTokenAddress4, createTransferInstruction as createTransferInstruction2, TOKEN_PROGRAM_ID as TOKEN_PROGRAM_ID4 } from "@solana/spl-token";
var DEXSCREENER_API_ENDPOINT, DEXSCREENER_PAYMENT_WALLET, USDC_MINT4, IS_DEVELOPMENT, DexScreenerService, dexScreenerService;
var init_DexScreenerService = __esm({
  "server/services/DexScreenerService.ts"() {
    "use strict";
    init_solana();
    init_solana();
    init_firebase();
    init_websocket();
    DEXSCREENER_API_ENDPOINT = process.env.DEXSCREENER_API_ENDPOINT || "https://api.dexscreener.com/latest";
    DEXSCREENER_PAYMENT_WALLET = process.env.DEXSCREENER_PAYMENT_WALLET;
    USDC_MINT4 = new PublicKey4("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    IS_DEVELOPMENT = process.env.NODE_ENV === "development";
    DexScreenerService = class {
      purchaseQueue = /* @__PURE__ */ new Map();
      maxRetries = 3;
      retryDelay = 3e4;
      // 30 seconds
      /**
       * Purchase DexScreener service when campaign reaches target
       */
      async purchaseService(campaignId, campaignData) {
        console.log(`Initiating DexScreener service purchase for campaign ${campaignId}`);
        if (IS_DEVELOPMENT) {
          console.log("Development mode: Simulating DexScreener purchase");
          await new Promise((resolve) => setTimeout(resolve, 2e3));
          return {
            success: true,
            serviceId: `dev_service_${Date.now()}`,
            confirmationData: {
              paymentSignature: `dev_payment_${Date.now()}`,
              submissionId: `dev_submission_${Date.now()}`,
              activationConfirmed: true,
              activationUrl: `https://dexscreener.com/solana/${campaignData.tokenAddress}`
            }
          };
        }
        try {
          if (this.purchaseQueue.has(campaignId)) {
            console.log(`Purchase already in progress for campaign ${campaignId}`);
            return { success: false, error: "Purchase already in progress", retryable: false };
          }
          this.purchaseQueue.set(campaignId, /* @__PURE__ */ new Date());
          const validation = await this.validateCampaignForPurchase(campaignId, campaignData);
          if (!validation.valid) {
            this.purchaseQueue.delete(campaignId);
            return { success: false, error: validation.error, retryable: validation.retryable };
          }
          let result;
          switch (campaignData.campaignType) {
            case "enhanced_token_info":
              result = await this.purchaseEnhancedTokenInfo(campaignId, campaignData);
              break;
            case "advertising":
              result = await this.purchaseAdvertising(campaignId, campaignData);
              break;
            case "boost":
              result = await this.purchaseBoost(campaignId, campaignData);
              break;
            default:
              result = { success: false, error: "Unsupported campaign type", retryable: false };
          }
          await this.recordPurchaseAttempt(campaignId, result);
          if (result.success) {
            await this.completeCampaign(campaignId, result);
            this.broadcastSuccess(campaignId, result);
          } else if (result.retryable) {
            this.scheduleRetry(campaignId, campaignData);
          }
          this.purchaseQueue.delete(campaignId);
          return result;
        } catch (error) {
          console.error(`Service purchase failed for campaign ${campaignId}:`, error);
          this.purchaseQueue.delete(campaignId);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown purchase error",
            retryable: true
          };
        }
      }
      /**
       * Purchase Enhanced Token Info service ($299)
       */
      async purchaseEnhancedTokenInfo(campaignId, campaignData) {
        console.log(`Purchasing Enhanced Token Info for campaign ${campaignId}`);
        try {
          const paymentResult = await this.makePaymentToDexScreener(campaignId, 299);
          if (!paymentResult.success) {
            return paymentResult;
          }
          const tokenMetadata = await this.fetchTokenMetadata(campaignData.tokenAddress);
          const submissionResult = await this.submitEnhancedTokenInfo({
            tokenAddress: campaignData.tokenAddress,
            tokenInfo: {
              address: campaignData.tokenAddress,
              name: campaignData.tokenName,
              symbol: campaignData.tokenSymbol,
              logoURI: campaignData.tokenLogoUrl,
              description: campaignData.description,
              ...tokenMetadata
            },
            paymentSignature: paymentResult.signature,
            submittedBy: campaignData.creatorAddress,
            campaignId
          });
          if (!submissionResult.success) {
            await this.recordFailedSubmission(campaignId, paymentResult.signature, submissionResult.error);
            return {
              success: false,
              error: `Payment successful but submission failed: ${submissionResult.error}`,
              retryable: true
            };
          }
          const activationResult = await this.verifyServiceActivation(campaignData.tokenAddress, "enhanced_info");
          return {
            success: true,
            serviceId: submissionResult.serviceId,
            confirmationData: {
              paymentSignature: paymentResult.signature,
              submissionId: submissionResult.serviceId,
              activationConfirmed: activationResult.confirmed,
              activationUrl: activationResult.url
            }
          };
        } catch (error) {
          console.error("Enhanced Token Info purchase error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Purchase failed",
            retryable: true
          };
        }
      }
      /**
       * Purchase Advertising service (custom budget)
       */
      async purchaseAdvertising(campaignId, campaignData) {
        console.log(`Purchasing Advertising for campaign ${campaignId}`);
        try {
          const amount = campaignData.targetAmount;
          const paymentResult = await this.makePaymentToDexScreener(campaignId, amount);
          if (!paymentResult.success) {
            return paymentResult;
          }
          const adRequest = {
            tokenAddress: campaignData.tokenAddress,
            campaignBudget: amount,
            paymentSignature: paymentResult.signature,
            adType: "banner",
            // Could be configurable
            duration: Math.floor(amount / 50),
            // Example: $50 per day
            submittedBy: campaignData.creatorAddress,
            campaignId
          };
          const submissionResult = await this.submitAdvertisingRequest(adRequest);
          return {
            success: submissionResult.success,
            serviceId: submissionResult.serviceId,
            confirmationData: submissionResult.success ? {
              paymentSignature: paymentResult.signature,
              adCampaignId: submissionResult.serviceId,
              budget: amount,
              estimatedDuration: adRequest.duration
            } : void 0,
            error: submissionResult.error
          };
        } catch (error) {
          console.error("Advertising purchase error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Advertising purchase failed",
            retryable: true
          };
        }
      }
      /**
       * Purchase Boost service (variable pricing)
       */
      async purchaseBoost(campaignId, campaignData) {
        console.log(`Purchasing Boost for campaign ${campaignId}`);
        try {
          const amount = campaignData.targetAmount;
          const paymentResult = await this.makePaymentToDexScreener(campaignId, amount);
          if (!paymentResult.success) {
            return paymentResult;
          }
          const boostRequest = {
            tokenAddress: campaignData.tokenAddress,
            boostAmount: amount,
            paymentSignature: paymentResult.signature,
            boostType: this.determineBoostType(amount),
            submittedBy: campaignData.creatorAddress,
            campaignId
          };
          const submissionResult = await this.submitBoostRequest(boostRequest);
          return {
            success: submissionResult.success,
            serviceId: submissionResult.serviceId,
            confirmationData: submissionResult.success ? {
              paymentSignature: paymentResult.signature,
              boostId: submissionResult.serviceId,
              boostType: boostRequest.boostType,
              amount
            } : void 0,
            error: submissionResult.error
          };
        } catch (error) {
          console.error("Boost purchase error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Boost purchase failed",
            retryable: true
          };
        }
      }
      /**
       * Make USDC payment to DexScreener wallet
       */
      async makePaymentToDexScreener(campaignId, amount) {
        try {
          if (!DEXSCREENER_PAYMENT_WALLET) {
            throw new Error("DexScreener payment wallet not configured");
          }
          const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
          if (!walletDoc.exists) {
            throw new Error("Campaign wallet not found");
          }
          const walletData = walletDoc.data();
          const campaignKeypair = await decryptPrivateKey(walletData.encryptedPrivateKey);
          const fromTokenAccount = await getAssociatedTokenAddress4(USDC_MINT4, campaignKeypair.publicKey);
          const toPublicKey = new PublicKey4(DEXSCREENER_PAYMENT_WALLET);
          const toTokenAccount = await getAssociatedTokenAddress4(USDC_MINT4, toPublicKey);
          const transferInstruction = createTransferInstruction2(
            fromTokenAccount,
            toTokenAccount,
            campaignKeypair.publicKey,
            amount * 1e6,
            // USDC has 6 decimals
            [],
            TOKEN_PROGRAM_ID4
          );
          const transaction = new Transaction2().add(transferInstruction);
          const signature = await sendAndConfirmTransaction2(
            connection,
            transaction,
            [campaignKeypair],
            { commitment: "confirmed" }
          );
          console.log(`Payment sent to DexScreener: ${amount} USDC, signature: ${signature}`);
          await this.recordPayment(campaignId, amount, signature, DEXSCREENER_PAYMENT_WALLET);
          return { success: true, signature };
        } catch (error) {
          console.error("Payment to DexScreener failed:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Payment failed"
          };
        }
      }
      /**
       * Submit Enhanced Token Info to DexScreener
       */
      async submitEnhancedTokenInfo(request) {
        try {
          console.log("Submitting Enhanced Token Info request:", request);
          const response = await this.mockDexScreenerSubmission("enhanced_token_info", request);
          if (response.success) {
            console.log(`Enhanced Token Info submitted successfully: ${response.serviceId}`);
            return {
              success: true,
              serviceId: response.serviceId
            };
          } else {
            return {
              success: false,
              error: response.error || "Submission failed"
            };
          }
        } catch (error) {
          console.error("Enhanced Token Info submission error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Submission error"
          };
        }
      }
      /**
       * Submit advertising request to DexScreener
       */
      async submitAdvertisingRequest(request) {
        try {
          console.log("Submitting advertising request:", request);
          const response = await this.mockDexScreenerSubmission("advertising", request);
          return {
            success: response.success,
            serviceId: response.serviceId,
            error: response.error
          };
        } catch (error) {
          console.error("Advertising submission error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Advertising submission error"
          };
        }
      }
      /**
       * Submit boost request to DexScreener
       */
      async submitBoostRequest(request) {
        try {
          console.log("Submitting boost request:", request);
          const response = await this.mockDexScreenerSubmission("boost", request);
          return {
            success: response.success,
            serviceId: response.serviceId,
            error: response.error
          };
        } catch (error) {
          console.error("Boost submission error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Boost submission error"
          };
        }
      }
      /**
       * Mock DexScreener API submission (replace with real API calls)
       */
      async mockDexScreenerSubmission(serviceType, request) {
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const success = Math.random() > 0.05;
        if (success) {
          return {
            success: true,
            serviceId: `${serviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
        } else {
          return {
            success: false,
            error: "DexScreener API temporarily unavailable"
          };
        }
      }
      /**
       * Fetch token metadata from various sources
       */
      async fetchTokenMetadata(tokenAddress) {
        try {
          if (process.env.HELIUS_API_KEY) {
            const heliusMetadata = await this.fetchHeliusMetadata(tokenAddress);
            if (heliusMetadata) {
              return heliusMetadata;
            }
          }
          const metadata = await this.fetchFallbackMetadata(tokenAddress);
          return metadata;
        } catch (error) {
          console.error("Token metadata fetch error:", error);
          return {};
        }
      }
      /**
       * Fetch metadata from Helius DAS API
       */
      async fetchHeliusMetadata(tokenAddress) {
        try {
          const response = await axios2.post(
            `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
            {
              mintAccounts: [tokenAddress]
            }
          );
          const metadata = response.data?.[0];
          if (!metadata) return null;
          return {
            logoURI: metadata.offChainMetadata?.image,
            description: metadata.offChainMetadata?.description,
            website: metadata.offChainMetadata?.external_url,
            twitter: this.extractTwitter(metadata.offChainMetadata),
            telegram: this.extractTelegram(metadata.offChainMetadata)
          };
        } catch (error) {
          console.error("Helius metadata fetch error:", error);
          return null;
        }
      }
      /**
       * Fallback metadata fetching
       */
      async fetchFallbackMetadata(tokenAddress) {
        try {
          const response = await axios2.get(`https://cache.jup.ag/tokens/${tokenAddress}`);
          const data = response.data;
          return {
            logoURI: data.logoURI,
            description: data.description || "",
            website: data.extensions?.website,
            twitter: data.extensions?.twitter,
            telegram: data.extensions?.telegram
          };
        } catch (error) {
          console.error("Fallback metadata fetch error:", error);
          return {};
        }
      }
      /**
       * Verify service activation on DexScreener
       */
      async verifyServiceActivation(tokenAddress, serviceType) {
        try {
          const response = await axios2.get(`${DEXSCREENER_API_ENDPOINT}/dex/tokens/${tokenAddress}`);
          if (response.data && response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs[0];
            const hasEnhancedInfo = pair.info?.websites?.length > 0 || pair.info?.socials?.length > 0;
            return {
              confirmed: hasEnhancedInfo,
              url: `https://dexscreener.com/solana/${tokenAddress}`
            };
          }
          return { confirmed: false, error: "Token not found on DexScreener" };
        } catch (error) {
          console.error("Service activation verification error:", error);
          return {
            confirmed: false,
            error: error instanceof Error ? error.message : "Verification failed"
          };
        }
      }
      /**
       * Validate campaign is ready for purchase
       */
      async validateCampaignForPurchase(campaignId, campaignData) {
        try {
          if (campaignData.status !== "funded") {
            return { valid: false, error: "Campaign is not in funded status", retryable: false };
          }
          if (campaignData.currentAmount < campaignData.targetAmount) {
            return { valid: false, error: "Insufficient funds for purchase", retryable: true };
          }
          if (/* @__PURE__ */ new Date() > new Date(campaignData.deadline)) {
            return { valid: false, error: "Campaign deadline has passed", retryable: false };
          }
          const existingService = await db.collection(collections.services).where("campaignId", "==", campaignId).where("status", "==", "active").limit(1).get();
          if (!existingService.empty) {
            return { valid: false, error: "Service already purchased for this campaign", retryable: false };
          }
          return { valid: true };
        } catch (error) {
          console.error("Campaign validation error:", error);
          return {
            valid: false,
            error: error instanceof Error ? error.message : "Validation failed",
            retryable: true
          };
        }
      }
      /**
       * Record purchase attempt in database
       */
      async recordPurchaseAttempt(campaignId, result) {
        try {
          const attemptRef = db.collection("purchase_attempts").doc();
          await attemptRef.set({
            id: attemptRef.id,
            campaignId,
            timestamp: /* @__PURE__ */ new Date(),
            success: result.success,
            error: result.error,
            retryable: result.retryable,
            serviceId: result.serviceId,
            confirmationData: result.confirmationData
          });
        } catch (error) {
          console.error("Error recording purchase attempt:", error);
        }
      }
      /**
       * Complete campaign after successful purchase
       */
      async completeCampaign(campaignId, result) {
        try {
          await db.collection(collections.campaigns).doc(campaignId).update({
            status: "completed",
            completedAt: /* @__PURE__ */ new Date(),
            serviceDetails: result.confirmationData
          });
          const serviceRef = db.collection(collections.services).doc();
          const service = {
            id: serviceRef.id,
            campaignId,
            serviceType: (await db.collection(collections.campaigns).doc(campaignId).get()).data().campaignType,
            purchaseDetails: result.confirmationData || {},
            confirmationData: result.confirmationData || {},
            purchasedAt: /* @__PURE__ */ new Date(),
            status: "active"
          };
          await serviceRef.set(service);
          console.log(`Campaign ${campaignId} completed successfully`);
        } catch (error) {
          console.error("Error completing campaign:", error);
        }
      }
      /**
       * Schedule retry for failed purchase
       */
      scheduleRetry(campaignId, campaignData) {
        setTimeout(async () => {
          console.log(`Retrying purchase for campaign ${campaignId}`);
          await this.purchaseService(campaignId, campaignData);
        }, this.retryDelay);
      }
      /**
       * Broadcast success notification
       */
      broadcastSuccess(campaignId, result) {
        try {
          if (wsService) {
            wsService.broadcast({
              type: "service_purchased",
              campaignId,
              serviceDetails: result.confirmationData
            });
          }
        } catch (error) {
          console.error("Error broadcasting success:", error);
        }
      }
      /**
       * Utility functions
       */
      determineBoostType(amount) {
        if (amount >= 1e3) return "premium";
        if (amount >= 500) return "standard";
        return "basic";
      }
      extractTwitter(metadata) {
        if (!metadata) return void 0;
        return metadata.twitter || metadata.social?.twitter || metadata.links?.find((l) => l.type === "twitter")?.url;
      }
      extractTelegram(metadata) {
        if (!metadata) return void 0;
        return metadata.telegram || metadata.social?.telegram || metadata.links?.find((l) => l.type === "telegram")?.url;
      }
      async recordPayment(campaignId, amount, signature, recipient) {
        try {
          const paymentRef = db.collection("payments").doc();
          await paymentRef.set({
            id: paymentRef.id,
            campaignId,
            amount,
            signature,
            recipient,
            timestamp: /* @__PURE__ */ new Date(),
            type: "dexscreener_service_payment"
          });
        } catch (error) {
          console.error("Error recording payment:", error);
        }
      }
      async recordFailedSubmission(campaignId, paymentSignature, error) {
        try {
          const failureRef = db.collection("failed_submissions").doc();
          await failureRef.set({
            id: failureRef.id,
            campaignId,
            paymentSignature,
            error,
            timestamp: /* @__PURE__ */ new Date(),
            needsManualReview: true
          });
        } catch (error2) {
          console.error("Error recording failed submission:", error2);
        }
      }
      /**
       * Get purchase status for a campaign
       */
      async getPurchaseStatus(campaignId) {
        try {
          const serviceDoc = await db.collection(collections.services).where("campaignId", "==", campaignId).limit(1).get();
          if (!serviceDoc.empty) {
            const service = serviceDoc.docs[0].data();
            return {
              purchased: true,
              status: service.status,
              details: service.confirmationData
            };
          }
          const attemptsSnapshot = await db.collection("purchase_attempts").where("campaignId", "==", campaignId).get();
          return {
            purchased: false,
            attempts: attemptsSnapshot.size,
            status: attemptsSnapshot.empty ? "not_attempted" : "failed"
          };
        } catch (error) {
          console.error("Error getting purchase status:", error);
          return { purchased: false };
        }
      }
      /**
       * Manual purchase trigger for admin
       */
      async manualPurchaseTrigger(campaignId) {
        try {
          const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
          if (!campaignDoc.exists) {
            return { success: false, error: "Campaign not found", retryable: false };
          }
          const campaignData = campaignDoc.data();
          return await this.purchaseService(campaignId, campaignData);
        } catch (error) {
          console.error("Manual purchase trigger error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Manual trigger failed",
            retryable: true
          };
        }
      }
    };
    dexScreenerService = new DexScreenerService();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  projects;
  currentUserId;
  currentProjectId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.projects = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.initializeStorage();
  }
  initializeStorage() {
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    return user;
  }
  async getProject(id) {
    return this.projects.get(id);
  }
  async createProject(insertProject) {
    const id = this.currentProjectId++;
    const project = {
      ...insertProject,
      id,
      currentFunding: 0,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.projects.set(id, project);
    return project;
  }
  async getFeaturedProjects() {
    return Array.from(this.projects.values()).filter((project) => project.isActive).slice(0, 6);
  }
  async getStats() {
    const activeProjects = Array.from(this.projects.values()).filter((p) => p.isActive).length;
    const totalFunded = Array.from(this.projects.values()).reduce((sum, project) => sum + project.currentFunding, 0);
    return {
      totalFunded: `$${(totalFunded / 1e6).toFixed(1)}M`,
      activeProjects,
      backers: `${(this.users.size * 1e3 / 1e3).toFixed(1)}K`
    };
  }
};
var storage = new MemStorage();

// server/routes/campaigns.ts
import { Router } from "express";

// server/services/campaign.ts
init_firebase();
init_solana();

// server/services/refund.ts
init_firebase();
init_solana();
import { Connection as Connection2, PublicKey as PublicKey2, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddress as getAssociatedTokenAddress2, createTransferInstruction, TOKEN_PROGRAM_ID as TOKEN_PROGRAM_ID2 } from "@solana/spl-token";
var USDC_MINT2 = new PublicKey2("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var connection2 = new Connection2(process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com", "confirmed");
var RefundService = class {
  async processRefunds(campaignId) {
    console.log(`Processing refunds for campaign ${campaignId}`);
    const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
    if (!walletDoc.exists) {
      throw new Error("Campaign wallet not found");
    }
    const walletData = walletDoc.data();
    const campaignKeypair = await decryptPrivateKey(walletData.encryptedPrivateKey);
    const contributionsSnapshot = await db.collection(collections.contributions).where("campaignId", "==", campaignId).where("status", "==", "confirmed").where("refunded", "!=", true).get();
    const contributions = contributionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    for (const contribution of contributions) {
      try {
        await this.processIndividualRefund(campaignId, contribution, campaignKeypair);
      } catch (error) {
        console.error(`Failed to refund contribution ${contribution.id}:`, error);
      }
    }
  }
  async processIndividualRefund(campaignId, contribution, campaignKeypair) {
    const refundRef = db.collection(collections.refunds).doc();
    const refund = {
      id: refundRef.id,
      contributionId: contribution.id,
      campaignId,
      amount: contribution.amount,
      status: "processing",
      reason: "Campaign deadline expired without reaching target",
      recipientAddress: contribution.contributorAddress
    };
    await refundRef.set(refund);
    try {
      const fromTokenAccount = await getAssociatedTokenAddress2(
        USDC_MINT2,
        campaignKeypair.publicKey
      );
      const toPublicKey = new PublicKey2(contribution.contributorAddress);
      const toTokenAccount = await getAssociatedTokenAddress2(USDC_MINT2, toPublicKey);
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        campaignKeypair.publicKey,
        contribution.amount * 1e6,
        // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID2
      );
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendAndConfirmTransaction(
        connection2,
        transaction,
        [campaignKeypair],
        { commitment: "confirmed" }
      );
      await refundRef.update({
        status: "completed",
        transactionHash: signature,
        processedAt: /* @__PURE__ */ new Date()
      });
      await db.collection(collections.contributions).doc(contribution.id).update({
        refunded: true,
        refundTxHash: signature
      });
      console.log(`Refund processed for contribution ${contribution.id}: ${signature}`);
    } catch (error) {
      console.error(`Refund failed for contribution ${contribution.id}:`, error);
      await refundRef.update({
        status: "failed",
        processedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  async getRefundStatus(contributionId) {
    const snapshot = await db.collection(collections.refunds).where("contributionId", "==", contributionId).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  async getAllRefunds(campaignId) {
    const snapshot = await db.collection(collections.refunds).where("campaignId", "==", campaignId).orderBy("processedAt", "desc").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
  }
};
var refundService = new RefundService();

// server/services/TransactionVerification.ts
init_solana();
init_firebase();
import { PublicKey as PublicKey3 } from "@solana/web3.js";
import { getAssociatedTokenAddress as getAssociatedTokenAddress3 } from "@solana/spl-token";
import axios from "axios";
var USDC_MINT3 = new PublicKey3("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
var HELIUS_API_KEY2 = process.env.HELIUS_API_KEY;
var TransactionVerificationService = class {
  processedTransactions = /* @__PURE__ */ new Set();
  constructor() {
    this.loadProcessedTransactions();
  }
  /**
   * Verify a single transaction and update campaign balance if valid
   */
  async verifyTransaction(signature, campaignId, expectedAmount) {
    try {
      if (this.processedTransactions.has(signature)) {
        console.log(`Transaction ${signature} already processed`);
        return { valid: false, error: "Transaction already processed" };
      }
      const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
      if (!walletDoc.exists) {
        return { valid: false, error: "Campaign wallet not found" };
      }
      const campaignWalletAddress = walletDoc.data().publicKey;
      const campaignPublicKey = new PublicKey3(campaignWalletAddress);
      let transactionData = null;
      if (HELIUS_API_KEY2) {
        transactionData = await this.getHeliusTransactionData(signature);
      }
      let transaction = null;
      if (!transactionData) {
        transaction = await this.getStandardTransactionData(signature);
      }
      if (!transactionData && !transaction) {
        return { valid: false, error: "Transaction not found" };
      }
      const verification = transactionData ? this.verifyHeliusTransaction(transactionData, campaignWalletAddress, expectedAmount) : this.verifyStandardTransaction(transaction, campaignWalletAddress, expectedAmount);
      if (verification.valid) {
        this.processedTransactions.add(signature);
        await this.saveProcessedTransaction(signature, campaignId, verification);
        await this.recordVerifiedTransaction(signature, campaignId, verification);
      }
      return verification;
    } catch (error) {
      console.error(`Transaction verification failed for ${signature}:`, error);
      return { valid: false, error: error instanceof Error ? error.message : "Verification failed" };
    }
  }
  /**
   * Get enhanced transaction data from Helius
   */
  async getHeliusTransactionData(signature) {
    try {
      const response = await axios.post(
        `https://api.helius.xyz/v0/transactions/?api-key=${HELIUS_API_KEY2}`,
        {
          transactions: [signature]
        }
      );
      return response.data?.[0] || null;
    } catch (error) {
      console.error("Helius transaction fetch failed:", error);
      return null;
    }
  }
  /**
   * Get transaction data from standard Solana RPC
   */
  async getStandardTransactionData(signature) {
    try {
      let transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      if (!transaction) {
        transaction = await fallbackConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      }
      return transaction;
    } catch (error) {
      console.error("Standard transaction fetch failed:", error);
      return null;
    }
  }
  /**
   * Verify Helius enhanced transaction data
   */
  verifyHeliusTransaction(transaction, campaignWalletAddress, expectedAmount) {
    const usdcTransfers = transaction.tokenTransfers.filter(
      (transfer2) => transfer2.mint === USDC_MINT3.toBase58() && transfer2.toUserAccount === campaignWalletAddress
    );
    if (usdcTransfers.length === 0) {
      return { valid: false, error: "No USDC transfer to campaign wallet found" };
    }
    if (usdcTransfers.length > 1) {
      return { valid: false, error: "Multiple USDC transfers in single transaction not supported" };
    }
    const transfer = usdcTransfers[0];
    const amount = transfer.tokenAmount / 1e6;
    if (expectedAmount && Math.abs(amount - expectedAmount) > 0.01) {
      return {
        valid: false,
        error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`
      };
    }
    if (amount < 5) {
      return { valid: false, error: "Amount below minimum contribution of $5 USDC" };
    }
    return {
      valid: true,
      amount,
      fromAddress: transfer.fromUserAccount,
      toAddress: transfer.toUserAccount
    };
  }
  /**
   * Verify standard Solana transaction data
   */
  verifyStandardTransaction(transaction, campaignWalletAddress, expectedAmount) {
    if (!transaction.meta || transaction.meta.err) {
      return { valid: false, error: "Transaction failed or has no metadata" };
    }
    const preTokenBalances = transaction.meta.preTokenBalances || [];
    const postTokenBalances = transaction.meta.postTokenBalances || [];
    const campaignTokenChanges = postTokenBalances.filter(
      (balance) => balance.mint === USDC_MINT3.toBase58() && balance.owner === campaignWalletAddress
    );
    if (campaignTokenChanges.length === 0) {
      return { valid: false, error: "No USDC balance change for campaign wallet" };
    }
    const postBalance = campaignTokenChanges[0];
    const preBalance = preTokenBalances.find(
      (balance) => balance.mint === USDC_MINT3.toBase58() && balance.owner === campaignWalletAddress && balance.accountIndex === postBalance.accountIndex
    );
    const preAmount = preBalance ? preBalance.uiTokenAmount.uiAmount || 0 : 0;
    const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
    const amount = postAmount - preAmount;
    if (amount <= 0) {
      return { valid: false, error: "No positive USDC transfer detected" };
    }
    if (expectedAmount && Math.abs(amount - expectedAmount) > 0.01) {
      return {
        valid: false,
        error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`
      };
    }
    if (amount < 5) {
      return { valid: false, error: "Amount below minimum contribution of $5 USDC" };
    }
    let fromAddress = "";
    const instructions = transaction.transaction.message.instructions;
    for (const instruction of instructions) {
      if ("parsed" in instruction && instruction.parsed?.type === "transfer") {
        fromAddress = instruction.parsed.info?.authority || instruction.parsed.info?.source || "";
        break;
      }
    }
    return {
      valid: true,
      amount,
      fromAddress,
      toAddress: campaignWalletAddress
    };
  }
  /**
   * Monitor campaign wallet for new transactions
   */
  async monitorCampaignWallet(campaignId, walletAddress) {
    console.log(`Starting transaction monitoring for campaign ${campaignId} wallet ${walletAddress}`);
    try {
      const publicKey = new PublicKey3(walletAddress);
      if (HELIUS_API_KEY2) {
        await this.setupHeliusWebhook(walletAddress);
      } else {
        this.startTransactionPolling(campaignId, publicKey);
      }
    } catch (error) {
      console.error(`Failed to start monitoring for campaign ${campaignId}:`, error);
    }
  }
  /**
   * Set up Helius webhook for real-time transaction monitoring
   */
  async setupHeliusWebhook(walletAddress) {
    try {
      const webhookUrl = process.env.HELIUS_WEBHOOK_URL;
      if (!webhookUrl) {
        console.warn("HELIUS_WEBHOOK_URL not configured, falling back to polling");
        return;
      }
      const response = await axios.post(
        `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY2}`,
        {
          webhookURL: webhookUrl,
          transactionTypes: ["TRANSFER"],
          accountAddresses: [walletAddress],
          webhookType: "enhanced"
        }
      );
      console.log(`Helius webhook configured for wallet ${walletAddress}:`, response.data);
    } catch (error) {
      console.error("Failed to set up Helius webhook:", error);
    }
  }
  /**
   * Polling fallback for transaction monitoring
   */
  startTransactionPolling(campaignId, publicKey) {
    const pollInterval = 3e4;
    const poll = async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
        for (const sig of signatures) {
          if (!this.processedTransactions.has(sig.signature)) {
            const verification = await this.verifyTransaction(sig.signature, campaignId);
            if (verification.valid) {
              console.log(`New verified transaction for campaign ${campaignId}: ${sig.signature}`);
            }
          }
        }
      } catch (error) {
        console.error(`Polling error for campaign ${campaignId}:`, error);
      }
    };
    poll();
    setInterval(poll, pollInterval);
  }
  /**
   * Detect suspicious patterns that might indicate fraud
   */
  async detectSuspiciousActivity(contributorAddress, amount, campaignId) {
    const reasons = [];
    try {
      const recentContributions = await db.collection(collections.contributions).where("contributorAddress", "==", contributorAddress).where("timestamp", ">", new Date(Date.now() - 6e4)).get();
      if (recentContributions.size > 3) {
        reasons.push("Multiple contributions from same address within 1 minute");
      }
      if (amount > 1e4) {
        reasons.push("Unusually large contribution amount");
      }
      if (amount % 100 === 0 && amount > 100) {
        reasons.push("Suspicious round number contribution");
      }
      const allContributions = await db.collection(collections.contributions).where("contributorAddress", "==", contributorAddress).get();
      const totalContributed = allContributions.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );
      if (totalContributed > 5e4) {
        reasons.push("Contributor has unusually high total platform activity");
      }
      const uniqueCampaigns = new Set(allContributions.docs.map((doc) => doc.data().campaignId));
      if (uniqueCampaigns.size > 20) {
        reasons.push("Contributor active in unusually many campaigns");
      }
    } catch (error) {
      console.error("Fraud detection error:", error);
      reasons.push("Fraud detection system error");
    }
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }
  /**
   * Reconcile database balances with blockchain state
   */
  async reconcileCampaignBalance(campaignId) {
    try {
      const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
      if (!campaignDoc.exists) {
        throw new Error("Campaign not found");
      }
      const databaseBalance = campaignDoc.data().currentAmount || 0;
      const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
      if (!walletDoc.exists) {
        throw new Error("Campaign wallet not found");
      }
      const walletAddress = walletDoc.data().publicKey;
      const publicKey = new PublicKey3(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress3(USDC_MINT3, publicKey);
      let blockchainBalance = 0;
      try {
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        blockchainBalance = accountInfo.value.uiAmount || 0;
      } catch (error) {
        blockchainBalance = 0;
      }
      const discrepancy = Math.abs(databaseBalance - blockchainBalance);
      const reconciled = discrepancy < 0.01;
      if (!reconciled) {
        console.warn(`Balance discrepancy for campaign ${campaignId}: DB=${databaseBalance}, Blockchain=${blockchainBalance}`);
        if (discrepancy > 1) {
          await db.collection(collections.campaigns).doc(campaignId).update({
            currentAmount: blockchainBalance,
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      return {
        databaseBalance,
        blockchainBalance,
        discrepancy,
        reconciled
      };
    } catch (error) {
      console.error(`Balance reconciliation failed for campaign ${campaignId}:`, error);
      throw error;
    }
  }
  /**
   * Load previously processed transactions from database
   */
  async loadProcessedTransactions() {
    try {
      const snapshot = await db.collection(collections.transactions).where("status", "==", "confirmed").get();
      snapshot.docs.forEach((doc) => {
        const hash = doc.data().hash;
        if (hash) {
          this.processedTransactions.add(hash);
        }
      });
      console.log(`Loaded ${this.processedTransactions.size} processed transactions`);
    } catch (error) {
      console.error("Failed to load processed transactions:", error);
    }
  }
  /**
   * Save processed transaction to prevent double-spending
   */
  async saveProcessedTransaction(signature, campaignId, verification) {
    try {
      const transactionRef = db.collection(collections.transactions).doc();
      const transaction = {
        id: transactionRef.id,
        campaignId,
        type: "contribution",
        amount: verification.amount || 0,
        hash: signature,
        status: "confirmed",
        timestamp: /* @__PURE__ */ new Date(),
        fromAddress: verification.fromAddress || "",
        toAddress: verification.toAddress || ""
      };
      await transactionRef.set(transaction);
    } catch (error) {
      console.error("Failed to save processed transaction:", error);
    }
  }
  /**
   * Record verified transaction in audit trail
   */
  async recordVerifiedTransaction(signature, campaignId, verification) {
    try {
      const auditRef = db.collection("audit_trail").doc();
      await auditRef.set({
        id: auditRef.id,
        type: "transaction_verified",
        campaignId,
        transactionHash: signature,
        amount: verification.amount,
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        timestamp: /* @__PURE__ */ new Date(),
        verificationMethod: HELIUS_API_KEY2 ? "helius" : "standard_rpc"
      });
    } catch (error) {
      console.error("Failed to record transaction audit:", error);
    }
  }
  /**
   * Get verification status of a transaction
   */
  async getTransactionStatus(signature) {
    const processed = this.processedTransactions.has(signature);
    if (!processed) {
      return { processed: false, verified: false };
    }
    try {
      const transactionDoc = await db.collection(collections.transactions).where("hash", "==", signature).limit(1).get();
      if (transactionDoc.empty) {
        return { processed: true, verified: false };
      }
      const details = transactionDoc.docs[0].data();
      return {
        processed: true,
        verified: details.status === "confirmed",
        details
      };
    } catch (error) {
      console.error("Failed to get transaction status:", error);
      return { processed: true, verified: false };
    }
  }
};
var transactionVerificationService = new TransactionVerificationService();

// server/services/HeliusWebhook.ts
init_firebase();
import crypto from "crypto";
init_websocket();
var WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;
var USDC_MINT5 = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
var HeliusWebhookService = class {
  /**
   * Process incoming Helius webhook
   */
  async processWebhook(req, res) {
    try {
      if (!this.verifyWebhookSignature(req)) {
        console.warn("Invalid webhook signature");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const payload = req.body;
      if (!Array.isArray(payload)) {
        res.status(400).json({ error: "Invalid payload format" });
        return;
      }
      console.log(`Processing ${payload.length} webhook events`);
      for (const transaction of payload) {
        await this.processTransaction(transaction);
      }
      res.status(200).json({
        success: true,
        processed: payload.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(req) {
    if (!WEBHOOK_SECRET) {
      console.warn("HELIUS_WEBHOOK_SECRET not configured - skipping signature verification");
      return true;
    }
    const signature = req.headers["x-helius-signature"];
    if (!signature) {
      return false;
    }
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    return signature === expectedSignature;
  }
  /**
   * Process individual transaction from webhook
   */
  async processTransaction(transaction) {
    try {
      console.log(`Processing transaction: ${transaction.signature}`);
      const usdcTransfers = transaction.tokenTransfers?.filter(
        (transfer) => transfer.mint === USDC_MINT5
      ) || [];
      if (usdcTransfers.length === 0) {
        console.log(`No USDC transfers in transaction ${transaction.signature}`);
        return;
      }
      for (const transfer of usdcTransfers) {
        await this.processUSDCTransfer(transaction, transfer);
      }
    } catch (error) {
      console.error(`Error processing transaction ${transaction.signature}:`, error);
    }
  }
  /**
   * Process USDC transfer and update campaign if relevant
   */
  async processUSDCTransfer(transaction, transfer) {
    try {
      const campaignWallet = await this.findCampaignByWallet(transfer.toUserAccount);
      if (!campaignWallet) {
        console.log(`Transfer to ${transfer.toUserAccount} - not a campaign wallet`);
        return;
      }
      const campaignId = campaignWallet.campaignId;
      const amount = transfer.tokenAmount / 1e6;
      console.log(`USDC transfer detected: ${amount} USDC to campaign ${campaignId}`);
      const verification = await transactionVerificationService.verifyTransaction(
        transaction.signature,
        campaignId,
        amount
      );
      if (!verification.valid) {
        console.warn(`Transaction verification failed for ${transaction.signature}:`, verification.error);
        return;
      }
      const suspiciousActivity = await transactionVerificationService.detectSuspiciousActivity(
        transfer.fromUserAccount,
        amount,
        campaignId
      );
      if (suspiciousActivity.suspicious) {
        console.warn(`Suspicious activity detected for transaction ${transaction.signature}:`, suspiciousActivity.reasons);
        await this.recordSuspiciousActivity(transaction.signature, campaignId, suspiciousActivity);
      }
      await this.recordContribution(transaction, transfer, campaignId, verification);
      await this.updateCampaignBalance(campaignId, amount);
      this.broadcastUpdate(campaignId, {
        type: "new_contribution",
        signature: transaction.signature,
        amount,
        contributor: transfer.fromUserAccount,
        timestamp: new Date(transaction.timestamp * 1e3)
      });
      console.log(`Successfully processed contribution: ${amount} USDC to campaign ${campaignId}`);
    } catch (error) {
      console.error("Error processing USDC transfer:", error);
    }
  }
  /**
   * Find campaign by wallet address
   */
  async findCampaignByWallet(walletAddress) {
    try {
      const walletSnapshot = await db.collection(collections.wallets).where("publicKey", "==", walletAddress).limit(1).get();
      if (walletSnapshot.empty) {
        return null;
      }
      const walletData = walletSnapshot.docs[0].data();
      return { campaignId: walletData.campaignId };
    } catch (error) {
      console.error("Error finding campaign by wallet:", error);
      return null;
    }
  }
  /**
   * Record contribution in database
   */
  async recordContribution(transaction, transfer, campaignId, verification) {
    try {
      const contributionRef = db.collection(collections.contributions).doc();
      const contribution = {
        id: contributionRef.id,
        campaignId,
        contributorAddress: transfer.fromUserAccount,
        amount: verification.amount,
        transactionHash: transaction.signature,
        timestamp: new Date(transaction.timestamp * 1e3),
        status: "confirmed",
        blockHeight: transaction.slot,
        verificationMethod: "helius_webhook"
      };
      await contributionRef.set(contribution);
      console.log(`Contribution recorded: ${contribution.id}`);
    } catch (error) {
      console.error("Error recording contribution:", error);
    }
  }
  /**
   * Update campaign balance and check for completion
   */
  async updateCampaignBalance(campaignId, contributionAmount) {
    try {
      const campaignRef = db.collection(collections.campaigns).doc(campaignId);
      const campaignDoc = await campaignRef.get();
      if (!campaignDoc.exists) {
        console.error(`Campaign ${campaignId} not found`);
        return;
      }
      const campaignData = campaignDoc.data();
      const newBalance = (campaignData.currentAmount || 0) + contributionAmount;
      await campaignRef.update({
        currentAmount: newBalance,
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (newBalance >= campaignData.targetAmount && campaignData.status === "active") {
        console.log(`Campaign ${campaignId} reached target! Triggering service purchase...`);
        await campaignRef.update({
          status: "funded",
          fundedAt: /* @__PURE__ */ new Date()
        });
        this.triggerServicePurchase(campaignId, campaignData);
      }
      console.log(`Campaign ${campaignId} balance updated: ${newBalance} USDC`);
    } catch (error) {
      console.error("Error updating campaign balance:", error);
    }
  }
  /**
   * Trigger service purchase when campaign is funded
   */
  async triggerServicePurchase(campaignId, campaignData) {
    try {
      const { dexScreenerService: dexScreenerService2 } = await Promise.resolve().then(() => (init_DexScreenerService(), DexScreenerService_exports));
      await dexScreenerService2.purchaseService(campaignId, campaignData);
    } catch (error) {
      console.error(`Failed to trigger service purchase for campaign ${campaignId}:`, error);
    }
  }
  /**
   * Record suspicious activity for investigation
   */
  async recordSuspiciousActivity(signature, campaignId, activity) {
    try {
      const suspiciousRef = db.collection("suspicious_activity").doc();
      await suspiciousRef.set({
        id: suspiciousRef.id,
        transactionHash: signature,
        campaignId,
        reasons: activity.reasons,
        timestamp: /* @__PURE__ */ new Date(),
        investigated: false,
        resolved: false
      });
      console.warn(`Suspicious activity recorded: ${suspiciousRef.id}`);
    } catch (error) {
      console.error("Error recording suspicious activity:", error);
    }
  }
  /**
   * Broadcast real-time updates via WebSocket
   */
  broadcastUpdate(campaignId, update) {
    try {
      if (wsService) {
        wsService.broadcast({
          type: "helius_update",
          campaignId,
          data: update
        });
      }
    } catch (error) {
      console.error("Error broadcasting update:", error);
    }
  }
  /**
   * Set up webhook for a campaign wallet
   */
  async setupWebhookForCampaign(campaignId, walletAddress) {
    try {
      console.log(`Setting up Helius webhook for campaign ${campaignId} wallet ${walletAddress}`);
      const webhookRef = db.collection("webhook_subscriptions").doc(campaignId);
      await webhookRef.set({
        campaignId,
        walletAddress,
        createdAt: /* @__PURE__ */ new Date(),
        status: "active"
      });
      console.log(`Webhook subscription recorded for campaign ${campaignId}`);
    } catch (error) {
      console.error(`Error setting up webhook for campaign ${campaignId}:`, error);
    }
  }
  /**
   * Health check for webhook service
   */
  async healthCheck() {
    try {
      const webhookCount = await db.collection("webhook_subscriptions").where("status", "==", "active").get();
      const lastProcessedDoc = await db.collection("audit_trail").where("type", "==", "helius_webhook_processed").orderBy("timestamp", "desc").limit(1).get();
      return {
        status: "healthy",
        webhooks: webhookCount.size,
        lastProcessed: lastProcessedDoc.empty ? void 0 : lastProcessedDoc.docs[0].data().timestamp.toDate()
      };
    } catch (error) {
      console.error("Webhook health check error:", error);
      return {
        status: "unhealthy",
        webhooks: 0
      };
    }
  }
  /**
   * Reconcile all campaigns using webhook data
   */
  async reconcileAllCampaigns() {
    let reconciled = 0;
    let errors = 0;
    try {
      const campaignsSnapshot = await db.collection(collections.campaigns).where("status", "in", ["active", "funded"]).get();
      for (const campaignDoc of campaignsSnapshot.docs) {
        try {
          const result = await transactionVerificationService.reconcileCampaignBalance(campaignDoc.id);
          if (result.reconciled) {
            reconciled++;
          } else {
            console.warn(`Campaign ${campaignDoc.id} has balance discrepancy: ${result.discrepancy}`);
          }
        } catch (error) {
          console.error(`Reconciliation failed for campaign ${campaignDoc.id}:`, error);
          errors++;
        }
      }
      console.log(`Reconciliation complete: ${reconciled} campaigns reconciled, ${errors} errors`);
    } catch (error) {
      console.error("Campaign reconciliation error:", error);
      errors++;
    }
    return { reconciled, errors };
  }
};
var heliusWebhookService = new HeliusWebhookService();

// server/services/TokenMetadata.ts
init_solana();
import axios3 from "axios";
import { PublicKey as PublicKey5 } from "@solana/web3.js";
var HELIUS_API_KEY3 = process.env.HELIUS_API_KEY;
var TokenMetadataService = class {
  /**
   * Get comprehensive token metadata from multiple sources
   */
  async getTokenMetadata(tokenAddress) {
    try {
      console.log(`Fetching metadata for token: ${tokenAddress}`);
      new PublicKey5(tokenAddress);
      const metadata = {
        address: tokenAddress,
        name: "",
        symbol: "",
        verified: false,
        tags: []
      };
      if (HELIUS_API_KEY3) {
        const heliusData = await this.fetchHeliusMetadata(tokenAddress);
        if (heliusData) {
          Object.assign(metadata, heliusData);
        }
      }
      if (!metadata.name || !metadata.symbol) {
        const jupiterData = await this.fetchJupiterMetadata(tokenAddress);
        if (jupiterData) {
          Object.assign(metadata, jupiterData);
        }
      }
      if (!metadata.name || !metadata.symbol) {
        const registryData = await this.fetchTokenRegistryData(tokenAddress);
        if (registryData) {
          Object.assign(metadata, registryData);
        }
      }
      const onChainData = await this.fetchOnChainData(tokenAddress);
      if (onChainData) {
        metadata.supply = onChainData.supply;
        metadata.holders = onChainData.holders;
      }
      const marketData = await this.fetchDexScreenerData(tokenAddress);
      if (marketData) {
        metadata.marketData = marketData;
        if (marketData.verified) {
          metadata.verified = true;
        }
      }
      if (metadata.coingeckoId) {
        const coingeckoData = await this.fetchCoinGeckoData(metadata.coingeckoId);
        if (coingeckoData) {
          Object.assign(metadata, coingeckoData);
        }
      }
      return this.validateAndCleanMetadata(metadata);
    } catch (error) {
      console.error(`Error fetching token metadata for ${tokenAddress}:`, error);
      throw new Error(`Failed to fetch token metadata: ${error.message}`);
    }
  }
  /**
   * Fetch metadata from Helius DAS API
   */
  async fetchHeliusMetadata(tokenAddress) {
    try {
      const response = await axios3.post(
        `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY3}`,
        {
          mintAccounts: [tokenAddress],
          includeOffChain: true,
          disableCache: false
        }
      );
      const data = response.data?.[0];
      if (!data) return null;
      const offChain = data.offChainMetadata || {};
      const onChain = data.onChainMetadata || {};
      return {
        name: offChain.name || onChain.name || "",
        symbol: offChain.symbol || onChain.symbol || "",
        description: offChain.description || "",
        image: offChain.image || "",
        website: this.extractWebsite(offChain),
        twitter: this.extractTwitter(offChain),
        telegram: this.extractTelegram(offChain),
        discord: this.extractDiscord(offChain),
        verified: data.verified || false,
        tags: this.extractTags(offChain)
      };
    } catch (error) {
      console.error("Helius metadata fetch error:", error);
      return null;
    }
  }
  /**
   * Fetch metadata from Jupiter API
   */
  async fetchJupiterMetadata(tokenAddress) {
    try {
      const response = await axios3.get(`https://cache.jup.ag/tokens/${tokenAddress}`);
      const data = response.data;
      if (!data) return null;
      return {
        name: data.name || "",
        symbol: data.symbol || "",
        image: data.logoURI || "",
        website: data.extensions?.website,
        twitter: data.extensions?.twitter,
        telegram: data.extensions?.telegram,
        coingeckoId: data.extensions?.coingeckoId,
        verified: data.verified || false,
        tags: data.tags || []
      };
    } catch (error) {
      console.error("Jupiter metadata fetch error:", error);
      return null;
    }
  }
  /**
   * Fetch data from Solana token registry
   */
  async fetchTokenRegistryData(tokenAddress) {
    try {
      const response = await axios3.get(
        `https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json`
      );
      const tokenList = response.data;
      const token = tokenList.tokens?.find((t) => t.address === tokenAddress);
      if (!token) return null;
      return {
        name: token.name || "",
        symbol: token.symbol || "",
        image: token.logoURI || "",
        verified: true,
        // Tokens in official registry are considered verified
        tags: token.tags || []
      };
    } catch (error) {
      console.error("Token registry fetch error:", error);
      return null;
    }
  }
  /**
   * Fetch on-chain token data
   */
  async fetchOnChainData(tokenAddress) {
    try {
      const mintPublicKey = new PublicKey5(tokenAddress);
      const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
      if (!mintInfo.value?.data || !("parsed" in mintInfo.value.data)) {
        return null;
      }
      const parsed = mintInfo.value.data.parsed;
      const supply = parsed.info?.supply ? parseInt(parsed.info.supply) : 0;
      const decimals = parsed.info?.decimals || 0;
      const adjustedSupply = supply / Math.pow(10, decimals);
      return {
        supply: {
          total: adjustedSupply,
          circulating: adjustedSupply
          // Assume total = circulating for simplicity
        }
      };
    } catch (error) {
      console.error("On-chain data fetch error:", error);
      return null;
    }
  }
  /**
   * Fetch market data from DexScreener
   */
  async fetchDexScreenerData(tokenAddress) {
    try {
      const response = await axios3.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );
      const data = response.data;
      if (!data?.pairs || data.pairs.length === 0) return null;
      const bestPair = data.pairs.reduce((best, current) => {
        const currentLiquidity = parseFloat(current.liquidity?.usd || "0");
        const bestLiquidity = parseFloat(best.liquidity?.usd || "0");
        return currentLiquidity > bestLiquidity ? current : best;
      });
      const price = parseFloat(bestPair.priceUsd || "0");
      const marketCap = parseFloat(bestPair.marketCap || "0");
      const volume24h = parseFloat(bestPair.volume?.h24 || "0");
      const priceChange24h = parseFloat(bestPair.priceChange?.h24 || "0");
      return {
        price,
        marketCap,
        volume24h,
        priceChange24h,
        verified: bestPair.info?.websites?.length > 0 || bestPair.info?.socials?.length > 0
      };
    } catch (error) {
      console.error("DexScreener data fetch error:", error);
      return null;
    }
  }
  /**
   * Fetch additional data from CoinGecko
   */
  async fetchCoinGeckoData(coingeckoId) {
    try {
      const response = await axios3.get(
        `https://api.coingecko.com/api/v3/coins/${coingeckoId}`,
        {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false
          }
        }
      );
      const data = response.data;
      if (!data) return null;
      return {
        description: data.description?.en || "",
        website: data.links?.homepage?.[0],
        twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : void 0,
        telegram: data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : void 0,
        discord: data.links?.discord,
        marketData: {
          price: data.market_data?.current_price?.usd,
          marketCap: data.market_data?.market_cap?.usd,
          volume24h: data.market_data?.total_volume?.usd,
          priceChange24h: data.market_data?.price_change_percentage_24h
        }
      };
    } catch (error) {
      console.error("CoinGecko data fetch error:", error);
      return null;
    }
  }
  /**
   * Extract website from metadata
   */
  extractWebsite(metadata) {
    if (!metadata) return void 0;
    return metadata.external_url || metadata.website || metadata.links?.find((l) => l.type === "website")?.url || metadata.attributes?.find((a) => a.trait_type === "website")?.value;
  }
  /**
   * Extract Twitter from metadata
   */
  extractTwitter(metadata) {
    if (!metadata) return void 0;
    const twitter = metadata.twitter || metadata.social?.twitter || metadata.links?.find((l) => l.type === "twitter")?.url || metadata.attributes?.find((a) => a.trait_type === "twitter")?.value;
    if (twitter && !twitter.startsWith("http")) {
      return `https://twitter.com/${twitter.replace("@", "")}`;
    }
    return twitter;
  }
  /**
   * Extract Telegram from metadata
   */
  extractTelegram(metadata) {
    if (!metadata) return void 0;
    const telegram = metadata.telegram || metadata.social?.telegram || metadata.links?.find((l) => l.type === "telegram")?.url || metadata.attributes?.find((a) => a.trait_type === "telegram")?.value;
    if (telegram && !telegram.startsWith("http")) {
      return `https://t.me/${telegram.replace("@", "")}`;
    }
    return telegram;
  }
  /**
   * Extract Discord from metadata
   */
  extractDiscord(metadata) {
    if (!metadata) return void 0;
    return metadata.discord || metadata.social?.discord || metadata.links?.find((l) => l.type === "discord")?.url || metadata.attributes?.find((a) => a.trait_type === "discord")?.value;
  }
  /**
   * Extract tags from metadata
   */
  extractTags(metadata) {
    if (!metadata) return [];
    const tags = metadata.tags || [];
    const categories = metadata.categories || [];
    const keywords = metadata.keywords || [];
    return [.../* @__PURE__ */ new Set([...tags, ...categories, ...keywords])].filter(Boolean);
  }
  /**
   * Validate and clean metadata
   */
  validateAndCleanMetadata(metadata) {
    if (!metadata.name && metadata.symbol) {
      metadata.name = metadata.symbol;
    }
    if (!metadata.symbol && metadata.name) {
      metadata.symbol = metadata.name.toUpperCase();
    }
    if (metadata.website && !this.isValidUrl(metadata.website)) {
      delete metadata.website;
    }
    if (metadata.twitter && !this.isValidUrl(metadata.twitter)) {
      delete metadata.twitter;
    }
    if (metadata.telegram && !this.isValidUrl(metadata.telegram)) {
      delete metadata.telegram;
    }
    if (metadata.discord && !this.isValidUrl(metadata.discord)) {
      delete metadata.discord;
    }
    if (metadata.image && !this.isValidUrl(metadata.image)) {
      delete metadata.image;
    }
    if (!Array.isArray(metadata.tags)) {
      metadata.tags = [];
    }
    if (metadata.description && metadata.description.length > 500) {
      metadata.description = metadata.description.substring(0, 497) + "...";
    }
    return metadata;
  }
  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get metadata for multiple tokens
   */
  async getMultipleTokenMetadata(tokenAddresses) {
    const results = /* @__PURE__ */ new Map();
    const batchSize = 5;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (address) => {
          try {
            const metadata = await this.getTokenMetadata(address);
            results.set(address, metadata);
          } catch (error) {
            console.error(`Failed to fetch metadata for ${address}:`, error);
            results.set(address, {
              address,
              name: "",
              symbol: "",
              verified: false,
              tags: []
            });
          }
        })
      );
      if (i + batchSize < tokenAddresses.length) {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return results;
  }
  /**
   * Search tokens by name or symbol
   */
  async searchTokens(query, limit = 20) {
    try {
      const response = await axios3.get("https://cache.jup.ag/tokens/all");
      const allTokens = response.data;
      const searchTerm = query.toLowerCase();
      const matchingTokens = allTokens.filter(
        (token) => token.name?.toLowerCase().includes(searchTerm) || token.symbol?.toLowerCase().includes(searchTerm)
      ).slice(0, limit);
      return matchingTokens.map((token) => ({
        address: token.address,
        name: token.name || "",
        symbol: token.symbol || "",
        description: "",
        image: token.logoURI,
        verified: token.verified || false,
        tags: token.tags || []
      }));
    } catch (error) {
      console.error("Token search error:", error);
      return [];
    }
  }
};
var tokenMetadataService = new TokenMetadataService();

// server/services/campaign.ts
var CampaignService = class {
  async createCampaign(data) {
    const campaignRef = db.collection(collections.campaigns).doc();
    const walletInfo = await generateCampaignWallet(campaignRef.id);
    let enhancedData = { ...data };
    try {
      const tokenMetadata = await tokenMetadataService.getTokenMetadata(data.tokenAddress);
      if (!data.tokenName && tokenMetadata.name) {
        enhancedData.tokenName = tokenMetadata.name;
      }
      if (!data.tokenSymbol && tokenMetadata.symbol) {
        enhancedData.tokenSymbol = tokenMetadata.symbol;
      }
      if (!data.tokenLogoUrl && tokenMetadata.image) {
        enhancedData.tokenLogoUrl = tokenMetadata.image;
      }
    } catch (error) {
      console.warn("Failed to enhance token metadata:", error);
    }
    const campaign = {
      id: campaignRef.id,
      ...enhancedData,
      // Ensure consistent field names for images
      logoUrl: enhancedData.tokenLogoUrl || enhancedData.logoUrl,
      currentAmount: 0,
      status: "active",
      walletAddress: walletInfo.publicKey,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    await campaignRef.set(campaign);
    await this.setupCampaignMonitoring(campaign.id, walletInfo.publicKey);
    return campaign;
  }
  async getCampaign(id) {
    const doc = await db.collection(collections.campaigns).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  async listCampaigns(filters) {
    let query = db.collection(collections.campaigns);
    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    } else if (filters?.tokenAddress) {
      query = query.where("tokenAddress", "==", filters.tokenAddress);
    } else if (filters?.campaignType) {
      query = query.where("campaignType", "==", filters.campaignType);
    }
    if (!filters?.status && !filters?.tokenAddress && !filters?.campaignType) {
      query = query.orderBy("createdAt", "desc");
    }
    const snapshot = await query.limit(50).get();
    const campaigns = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return campaigns.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }
  async updateCampaignAmount(campaignId, newAmount) {
    const campaignRef = db.collection(collections.campaigns).doc(campaignId);
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    const updates = {
      currentAmount: newAmount,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (newAmount >= campaign.targetAmount && campaign.status === "active") {
      updates.status = "funded";
      this.triggerServicePurchase(campaignId).catch(console.error);
    }
    await campaignRef.update(updates);
  }
  async recordContribution(data) {
    const contributionRef = db.collection(collections.contributions).doc();
    const contribution = {
      id: contributionRef.id,
      ...data,
      timestamp: /* @__PURE__ */ new Date(),
      status: "pending"
    };
    await contributionRef.set(contribution);
    this.verifyContribution(contribution.id, data.transactionHash).catch(console.error);
    return contribution;
  }
  async getContributions(campaignId) {
    const snapshot = await db.collection(collections.contributions).where("campaignId", "==", campaignId).get();
    const contributions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return contributions.sort((a, b) => {
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timestampB - timestampA;
    });
  }
  async setupCampaignMonitoring(campaignId, walletAddress) {
    try {
      await heliusWebhookService.setupWebhookForCampaign(campaignId, walletAddress);
      await transactionVerificationService.monitorCampaignWallet(campaignId, walletAddress);
      console.log(`Monitoring setup complete for campaign ${campaignId}`);
    } catch (error) {
      console.error(`Failed to setup monitoring for campaign ${campaignId}:`, error);
      this.startBasicBalanceMonitoring(campaignId, walletAddress);
    }
  }
  startBasicBalanceMonitoring(campaignId, walletAddress) {
    let lastBalance = 0;
    const unsubscribe = monitorWalletBalance(walletAddress, async (balance) => {
      if (balance !== lastBalance) {
        lastBalance = balance;
        await this.updateCampaignAmount(campaignId, balance);
      }
    });
  }
  async verifyContribution(contributionId, txHash) {
    try {
      const contributionDoc = await db.collection(collections.contributions).doc(contributionId).get();
      if (!contributionDoc.exists) {
        throw new Error("Contribution not found");
      }
      const contribution = contributionDoc.data();
      const verification = await transactionVerificationService.verifyTransaction(
        txHash,
        contribution.campaignId,
        contribution.amount
      );
      if (verification.valid) {
        await db.collection(collections.contributions).doc(contributionId).update({
          status: "confirmed",
          verifiedAt: /* @__PURE__ */ new Date()
        });
      } else {
        await db.collection(collections.contributions).doc(contributionId).update({
          status: "failed",
          verificationError: verification.error
        });
      }
    } catch (error) {
      console.error(`Contribution verification failed for ${contributionId}:`, error);
      await db.collection(collections.contributions).doc(contributionId).update({
        status: "failed",
        verificationError: error.message
      });
    }
  }
  async triggerServicePurchase(campaignId) {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }
      const { dexScreenerService: dexScreenerService2 } = await Promise.resolve().then(() => (init_DexScreenerService(), DexScreenerService_exports));
      const result = await dexScreenerService2.purchaseService(campaignId, campaign);
      if (result.success) {
        console.log(`Service purchase successful for campaign ${campaignId}`);
      } else {
        console.error(`Service purchase failed for campaign ${campaignId}:`, result.error);
      }
    } catch (error) {
      console.error(`Failed to trigger service purchase for campaign ${campaignId}:`, error);
    }
  }
  async checkDeadlines() {
    try {
      const now = /* @__PURE__ */ new Date();
      const activeCampaigns = await db.collection(collections.campaigns).where("status", "==", "active").get();
      const expiredCampaigns = activeCampaigns.docs.filter((doc) => {
        const campaign = doc.data();
        if (!campaign.deadline) return false;
        const deadline = new Date(campaign.deadline);
        return deadline <= now;
      });
      for (const doc of expiredCampaigns) {
        const campaign = doc.data();
        if (campaign.currentAmount < campaign.targetAmount) {
          await doc.ref.update({
            status: "failed",
            updatedAt: now
          });
          this.processRefunds(campaign.id || doc.id).catch(console.error);
        }
      }
    } catch (error) {
      console.error("Error checking campaign deadlines:", error);
    }
  }
  async processRefunds(campaignId) {
    try {
      await refundService.processRefunds(campaignId);
      await db.collection(collections.campaigns).doc(campaignId).update({
        status: "refunding",
        updatedAt: /* @__PURE__ */ new Date()
      });
    } catch (error) {
      console.error(`Failed to process refunds for campaign ${campaignId}:`, error);
    }
  }
};
var campaignService = new CampaignService();

// server/routes/campaigns.ts
import { z } from "zod";
var router = Router();
var CreateCampaignSchema = z.object({
  tokenAddress: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenLogoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  campaignType: z.enum(["enhanced_token_info", "advertising", "boost"]),
  targetAmount: z.number().min(5),
  deadline: z.string().transform((str) => new Date(str)),
  description: z.string(),
  creatorAddress: z.string()
});
router.post("/campaigns", async (req, res) => {
  try {
    const data = CreateCampaignSchema.parse(req.body);
    const campaign = await campaignService.createCampaign(data);
    res.json({ success: true, campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : "Failed to create campaign"
    });
  }
});
router.get("/campaigns", async (req, res) => {
  try {
    const { status, tokenAddress, campaignType } = req.query;
    const campaigns = await campaignService.listCampaigns({
      status,
      tokenAddress,
      campaignType
    });
    res.json({ success: true, campaigns });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    res.status(500).json({ success: false, error: "Failed to list campaigns" });
  }
});
router.get("/campaigns/:id", async (req, res) => {
  try {
    const campaign = await campaignService.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    console.error("Error getting campaign:", error);
    res.status(500).json({ success: false, error: "Failed to get campaign" });
  }
});
router.get("/campaigns/:id/contributions", async (req, res) => {
  try {
    const contributions = await campaignService.getContributions(req.params.id);
    res.json({ success: true, contributions });
  } catch (error) {
    console.error("Error getting contributions:", error);
    res.status(500).json({ success: false, error: "Failed to get contributions" });
  }
});
var ContributeSchema = z.object({
  contributorAddress: z.string(),
  amount: z.number().min(0.01),
  // Minimum 0.01 SOL
  transactionHash: z.string()
});
router.post("/campaigns/:id/contribute", async (req, res) => {
  try {
    const data = ContributeSchema.parse(req.body);
    const contribution = await campaignService.recordContribution({
      campaignId: req.params.id,
      ...data
    });
    res.json({ success: true, contribution });
  } catch (error) {
    console.error("Error recording contribution:", error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : "Failed to record contribution"
    });
  }
});
var campaigns_default = router;

// server/routes/balances.ts
init_solana();
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/balances/:wallet", async (req, res) => {
  try {
    const balance = await getUSDCBalance(req.params.wallet);
    res.json({ success: true, balance, wallet: req.params.wallet });
  } catch (error) {
    console.error("Error getting balance:", error);
    res.status(500).json({ success: false, error: "Failed to get balance" });
  }
});
router2.get("/transactions/:wallet", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const transactions = await getTransactionHistory(req.params.wallet, limit);
    res.json({ success: true, transactions, wallet: req.params.wallet });
  } catch (error) {
    console.error("Error getting transactions:", error);
    res.status(500).json({ success: false, error: "Failed to get transactions" });
  }
});
var balances_default = router2;

// server/routes/admin.ts
init_firebase();
import { Router as Router3 } from "express";
init_DexScreenerService();
var router3 = Router3();
var ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;
var authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
router3.use(authenticateAdmin);
router3.get("/stats", async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const dateRange = req.query.range || "7d";
    let startDate = /* @__PURE__ */ new Date();
    switch (dateRange) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    }
    const campaignsSnapshot = await db.collection(collections.campaigns).get();
    const campaigns = campaignsSnapshot.docs.map((doc) => doc.data());
    const recentCampaignsSnapshot = await db.collection(collections.campaigns).where("createdAt", ">=", startDate).get();
    const contributionsSnapshot = await db.collection(collections.contributions).where("status", "==", "confirmed").get();
    const contributions = contributionsSnapshot.docs.map((doc) => doc.data());
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
    const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;
    const totalFunded = campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
    const uniqueContributors = new Set(contributions.map((c) => c.contributorAddress)).size;
    const platformFees = totalFunded * 0.02;
    const successRate = totalCampaigns > 0 ? completedCampaigns / totalCampaigns * 100 : 0;
    const avgCampaignSize = totalCampaigns > 0 ? totalFunded / totalCampaigns : 0;
    res.json({
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalFunded,
      totalContributors: uniqueContributors,
      platformFees,
      successRate,
      avgCampaignSize,
      recentCampaigns: recentCampaignsSnapshot.size
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});
router3.get("/campaigns", async (req, res) => {
  try {
    const { status, campaignType, limit = "50" } = req.query;
    let query = db.collection(collections.campaigns).orderBy("createdAt", "desc");
    if (status) {
      query = query.where("status", "==", status);
    }
    if (campaignType) {
      query = query.where("campaignType", "==", campaignType);
    }
    const snapshot = await query.limit(parseInt(limit)).get();
    const campaigns = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const campaignData = doc.data();
        const contributionsSnapshot = await db.collection(collections.contributions).where("campaignId", "==", doc.id).where("status", "==", "confirmed").get();
        const uniqueContributors = new Set(
          contributionsSnapshot.docs.map((contrib) => contrib.data().contributorAddress)
        ).size;
        return {
          id: doc.id,
          ...campaignData,
          contributorCount: uniqueContributors
        };
      })
    );
    res.json(campaigns);
  } catch (error) {
    console.error("Admin campaigns error:", error);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});
router3.get("/users", async (req, res) => {
  try {
    const { status, limit = "100" } = req.query;
    const contributionsSnapshot = await db.collection(collections.contributions).where("status", "==", "confirmed").get();
    const contributions = contributionsSnapshot.docs.map((doc) => doc.data());
    const userMap = /* @__PURE__ */ new Map();
    contributions.forEach((contrib) => {
      const address = contrib.contributorAddress;
      if (!userMap.has(address)) {
        userMap.set(address, {
          address,
          totalContributed: 0,
          campaignsSupported: /* @__PURE__ */ new Set(),
          firstContribution: contrib.timestamp,
          lastActivity: contrib.timestamp,
          contributions: []
        });
      }
      const user = userMap.get(address);
      user.totalContributed += contrib.amount;
      user.campaignsSupported.add(contrib.campaignId);
      user.contributions.push(contrib);
      if (contrib.timestamp < user.firstContribution) {
        user.firstContribution = contrib.timestamp;
      }
      if (contrib.timestamp > user.lastActivity) {
        user.lastActivity = contrib.timestamp;
      }
    });
    const users = Array.from(userMap.values()).map((user) => {
      let riskScore = 0;
      if (user.totalContributed > 1e4) riskScore += 20;
      if (user.totalContributed > 5e4) riskScore += 30;
      if (user.campaignsSupported.size > 10) riskScore += 15;
      if (user.campaignsSupported.size > 25) riskScore += 25;
      const daysSinceFirst = (Date.now() - user.firstContribution.toDate().getTime()) / (1e3 * 60 * 60 * 24);
      if (daysSinceFirst < 1 && user.totalContributed > 1e3) riskScore += 40;
      const roundContributions = user.contributions.filter((c) => c.amount % 100 === 0).length;
      if (roundContributions / user.contributions.length > 0.8) riskScore += 25;
      return {
        address: user.address,
        totalContributed: user.totalContributed,
        campaignsSupported: user.campaignsSupported.size,
        firstContribution: user.firstContribution,
        lastActivity: user.lastActivity,
        riskScore: Math.min(100, riskScore),
        status: riskScore > 75 ? "flagged" : "active"
      };
    });
    users.sort((a, b) => b.totalContributed - a.totalContributed);
    const filteredUsers = status ? users.filter((u) => u.status === status) : users;
    res.json(filteredUsers.slice(0, parseInt(limit)));
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
router3.get("/transactions", async (req, res) => {
  try {
    const { type, status, limit = "100" } = req.query;
    let query = db.collection(collections.transactions).orderBy("timestamp", "desc");
    if (type) {
      query = query.where("type", "==", type);
    }
    if (status) {
      query = query.where("status", "==", status);
    }
    const snapshot = await query.limit(parseInt(limit)).get();
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      verificationMethod: doc.data().verificationMethod || "standard"
    }));
    res.json(transactions);
  } catch (error) {
    console.error("Admin transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
router3.get("/health", async (req, res) => {
  try {
    const health = await heliusWebhookService.healthCheck();
    let dbStatus = "healthy";
    try {
      await db.collection("_health_check").add({ timestamp: /* @__PURE__ */ new Date() });
    } catch (error) {
      dbStatus = "down";
    }
    let blockchainStatus = "healthy";
    try {
      const { connection: connection3 } = await Promise.resolve().then(() => (init_solana(), solana_exports));
      await connection3.getLatestBlockhash();
    } catch (error) {
      blockchainStatus = "down";
    }
    res.json({
      apiStatus: "healthy",
      dbStatus,
      blockchainStatus,
      webhookStatus: health.status,
      lastUpdate: /* @__PURE__ */ new Date(),
      errorRate: 0.5,
      // Mock data - implement real error tracking
      responseTime: 150
      // Mock data - implement real response time tracking
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      apiStatus: "down",
      dbStatus: "unknown",
      blockchainStatus: "unknown",
      webhookStatus: "unknown",
      lastUpdate: /* @__PURE__ */ new Date(),
      errorRate: 100,
      responseTime: 0
    });
  }
});
router3.put("/campaigns/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["active", "funded", "completed", "failed", "cancelled", "refunding"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    await db.collection(collections.campaigns).doc(id).update({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    });
    await db.collection("admin_actions").add({
      type: "campaign_status_update",
      campaignId: id,
      oldStatus: req.body.oldStatus,
      newStatus: status,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Campaign status update error:", error);
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});
router3.post("/campaigns/:id/refund", async (req, res) => {
  try {
    const { id } = req.params;
    await refundService.processRefunds(id);
    await db.collection(collections.campaigns).doc(id).update({
      status: "refunding",
      updatedAt: /* @__PURE__ */ new Date()
    });
    await db.collection("admin_actions").add({
      type: "manual_refund_trigger",
      campaignId: id,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Refund trigger error:", error);
    res.status(500).json({ error: "Failed to trigger refund" });
  }
});
router3.post("/campaigns/:id/purchase", async (req, res) => {
  try {
    const { id } = req.params;
    const campaignDoc = await db.collection(collections.campaigns).doc(id).get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    const campaignData = campaignDoc.data();
    const result = await dexScreenerService.manualPurchaseTrigger(id);
    await db.collection("admin_actions").add({
      type: "manual_purchase_trigger",
      campaignId: id,
      result: result.success,
      error: result.error,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json(result);
  } catch (error) {
    console.error("Purchase trigger error:", error);
    res.status(500).json({ error: "Failed to trigger purchase" });
  }
});
router3.post("/users/:address/ban", async (req, res) => {
  try {
    const { address } = req.params;
    await db.collection("banned_users").doc(address).set({
      address,
      bannedAt: /* @__PURE__ */ new Date(),
      reason: req.body.reason || "Administrative action",
      adminAction: true
    });
    await db.collection("admin_actions").add({
      type: "user_banned",
      userAddress: address,
      reason: req.body.reason,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ error: "Failed to ban user" });
  }
});
router3.post("/users/:address/unban", async (req, res) => {
  try {
    const { address } = req.params;
    await db.collection("banned_users").doc(address).delete();
    await db.collection("admin_actions").add({
      type: "user_unbanned",
      userAddress: address,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Unban user error:", error);
    res.status(500).json({ error: "Failed to unban user" });
  }
});
router3.post("/reconcile", async (req, res) => {
  try {
    const result = await heliusWebhookService.reconcileAllCampaigns();
    await db.collection("admin_actions").add({
      type: "balance_reconciliation",
      result,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json(result);
  } catch (error) {
    console.error("Reconciliation error:", error);
    res.status(500).json({ error: "Failed to reconcile balances" });
  }
});
router3.post("/platform/pause", async (req, res) => {
  try {
    await db.collection("platform_settings").doc("status").set({
      paused: true,
      pausedAt: /* @__PURE__ */ new Date(),
      reason: req.body.reason || "Administrative maintenance"
    });
    await db.collection("admin_actions").add({
      type: "platform_paused",
      reason: req.body.reason,
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Platform pause error:", error);
    res.status(500).json({ error: "Failed to pause platform" });
  }
});
router3.post("/platform/resume", async (req, res) => {
  try {
    await db.collection("platform_settings").doc("status").set({
      paused: false,
      resumedAt: /* @__PURE__ */ new Date()
    });
    await db.collection("admin_actions").add({
      type: "platform_resumed",
      timestamp: /* @__PURE__ */ new Date(),
      adminAction: true
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Platform resume error:", error);
    res.status(500).json({ error: "Failed to resume platform" });
  }
});
router3.get("/export/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { dateRange } = req.query;
    let data = [];
    let filename = "";
    switch (type) {
      case "campaigns":
        const campaignsSnapshot = await db.collection(collections.campaigns).get();
        data = campaignsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        filename = "campaigns.csv";
        break;
      case "contributions":
        const contributionsSnapshot = await db.collection(collections.contributions).get();
        data = contributionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        filename = "contributions.csv";
        break;
      case "transactions":
        const transactionsSnapshot = await db.collection(collections.transactions).get();
        data = transactionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        filename = "transactions.csv";
        break;
      default:
        return res.status(400).json({ error: "Invalid export type" });
    }
    if (data.length === 0) {
      return res.status(404).json({ error: "No data to export" });
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => {
        const value = row[header];
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value || "";
      }).join(","))
    ].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});
router3.get("/actions", async (req, res) => {
  try {
    const { limit = "50" } = req.query;
    const snapshot = await db.collection("admin_actions").orderBy("timestamp", "desc").limit(parseInt(limit)).get();
    const actions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(actions);
  } catch (error) {
    console.error("Admin actions error:", error);
    res.status(500).json({ error: "Failed to fetch admin actions" });
  }
});
var admin_default = router3;

// server/routes/webhook.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.post("/helius-webhook", async (req, res) => {
  await heliusWebhookService.processWebhook(req, res);
});
router4.get("/webhook/health", async (req, res) => {
  try {
    const health = await heliusWebhookService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Webhook health check failed" });
  }
});
var webhook_default = router4;

// server/routes/helius.ts
import axios4 from "axios";
console.log("[Server Helius API] Module loaded");
async function validateToken(req, res) {
  try {
    console.log("[Server Helius API] ========== START TOKEN VALIDATION ==========");
    console.log("[Server Helius API] Route called with body:", JSON.stringify(req.body, null, 2));
    console.log("[Server Helius API] Request headers:", JSON.stringify(req.headers, null, 2));
    const { contractAddress } = req.body;
    if (!contractAddress) {
      console.log("[Server Helius API] ERROR: No contract address provided");
      return res.status(400).json({
        isValid: false,
        error: "Contract address is required",
        contractAddress: ""
      });
    }
    if (!contractAddress || contractAddress.length < 32 || contractAddress.length > 44) {
      console.log("[Server Helius API] ERROR: Invalid address format");
      console.log("[Server Helius API] Address length:", contractAddress.length);
      console.log("[Server Helius API] Address:", contractAddress);
      return res.status(400).json({
        isValid: false,
        error: "Invalid Solana address format",
        contractAddress
      });
    }
    const HELIUS_API_KEY4 = process.env.HELIUS_API_KEY;
    console.log("[Server Helius API] Environment check:");
    console.log("[Server Helius API] - HELIUS_API_KEY available:", !!HELIUS_API_KEY4);
    console.log("[Server Helius API] - HELIUS_API_KEY value:", HELIUS_API_KEY4 ? `${HELIUS_API_KEY4.substring(0, 8)}...` : "NOT SET");
    console.log(`[Server Helius API] Validating token: ${contractAddress}`);
    if (!HELIUS_API_KEY4) {
      console.log("[Server Helius API] ERROR: No Helius API key configured");
      return res.status(500).json({
        isValid: false,
        error: "Helius API key not configured",
        contractAddress
      });
    }
    try {
      const apiUrl = `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY4}`;
      const requestPayload = {
        mintAccounts: [contractAddress]
      };
      console.log("[Server Helius API] Making token metadata request");
      const response = await axios4.post(
        apiUrl,
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 1e4
        }
      );
      console.log("[Server Helius API] Token metadata response received");
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const tokenData = response.data[0];
        const onChainMetadata = tokenData.onChainMetadata;
        const offChainMetadata = tokenData.offChainMetadata;
        const account = tokenData.account;
        if (!onChainMetadata && !offChainMetadata) {
          console.log("[Server Helius API] ERROR: No metadata found for token");
          return res.status(404).json({
            isValid: false,
            error: "Token metadata not found",
            contractAddress
          });
        }
        const metadata = {
          name: offChainMetadata?.name || onChainMetadata?.metadata?.data?.name || "Unknown Token",
          symbol: offChainMetadata?.symbol || onChainMetadata?.metadata?.data?.symbol || "UNKNOWN",
          description: offChainMetadata?.description || onChainMetadata?.metadata?.data?.uri || "",
          image: offChainMetadata?.image || "",
          supply: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.supply ? parseInt(tokenData.onChainAccountInfo.accountInfo.data.parsed.info.supply) : void 0,
          decimals: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.decimals || 9,
          verified: onChainMetadata?.metadata?.primarySaleHappened || false,
          mintAuthority: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.mintAuthority || null,
          freezeAuthority: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.freezeAuthority || null,
          updateAuthority: onChainMetadata?.metadata?.updateAuthority
        };
        if (offChainMetadata?.attributes) {
          const socialLinks = {};
          offChainMetadata.attributes.forEach((attr) => {
            if (attr.trait_type === "website") socialLinks.website = attr.value;
            if (attr.trait_type === "twitter") socialLinks.twitter = attr.value;
            if (attr.trait_type === "telegram") socialLinks.telegram = attr.value;
            if (attr.trait_type === "discord") socialLinks.discord = attr.value;
          });
          if (Object.keys(socialLinks).length > 0) {
            metadata.socialLinks = socialLinks;
            metadata.extensions = socialLinks;
          }
        }
        console.log(`[Server Helius API] Token validated successfully: ${metadata.name} (${metadata.symbol})`);
        return res.json({
          isValid: true,
          metadata,
          exists: true,
          contractAddress
        });
      }
      console.log("[Server Helius API] No token data in response array");
      return res.status(404).json({
        isValid: false,
        error: "Token not found in Helius database",
        contractAddress
      });
    } catch (apiError) {
      console.error("[Server Helius API] CATCH BLOCK - API Error occurred");
      console.error("[Server Helius API] Error type:", apiError.constructor.name);
      console.error("[Server Helius API] Error message:", apiError.message);
      console.error("[Server Helius API] Error code:", apiError.code);
      if (apiError.response) {
        console.error("[Server Helius API] Response error details:");
        console.error("[Server Helius API] - Status:", apiError.response.status);
        console.error("[Server Helius API] - Status text:", apiError.response.statusText);
        console.error("[Server Helius API] - Headers:", JSON.stringify(apiError.response.headers, null, 2));
        console.error("[Server Helius API] - Data:", JSON.stringify(apiError.response.data, null, 2));
      } else if (apiError.request) {
        console.error("[Server Helius API] Request made but no response received");
        console.error("[Server Helius API] Request details:", apiError.request);
      }
      const errorMessage = apiError?.response?.data?.error?.message || apiError.message || "Failed to fetch token data";
      const errorCode = apiError?.response?.data?.error?.code;
      console.log("[Server Helius API] ========== END TOKEN VALIDATION FAILURE ==========");
      return res.status(500).json({
        isValid: false,
        error: errorMessage,
        contractAddress,
        details: {
          errorCode,
          errorMessage,
          apiKeyPresent: !!HELIUS_API_KEY4,
          suggestion: errorCode === -32401 ? "The Helius API key may be invalid or expired. Please check your Helius dashboard and ensure the key has access to the token metadata endpoint." : void 0
        }
      });
    }
  } catch (error) {
    console.error("[Server Helius API] OUTER CATCH - General validation error:", error);
    console.error("[Server Helius API] Error stack:", error.stack);
    console.log("[Server Helius API] ========== END TOKEN VALIDATION OUTER ERROR ==========");
    return res.status(500).json({
      isValid: false,
      error: "General server error during token validation",
      contractAddress: req.body.contractAddress || "",
      details: {
        errorMessage: error.message,
        errorType: error.constructor.name
      }
    });
  }
}

// server/routes.ts
init_websocket();

// server/services/balanceMonitor.ts
import { Connection as Connection5, PublicKey as PublicKey6, LAMPORTS_PER_SOL as LAMPORTS_PER_SOL2 } from "@solana/web3.js";
var BalanceMonitorService = class {
  connection;
  constructor() {
    const rpcEndpoint = process.env.HELIUS_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
    this.connection = new Connection5(rpcEndpoint, "confirmed");
    console.log("[Balance Monitor] Initialized with RPC:", rpcEndpoint);
  }
  /**
   * Update balances for all active campaigns
   */
  async updateAllCampaignBalances() {
    try {
      console.log("[Balance Monitor] Starting balance update for all active campaigns...");
      const activeCampaigns = await campaignService.listCampaigns({ status: "active" });
      if (activeCampaigns.length === 0) {
        console.log("[Balance Monitor] No active campaigns found");
        return;
      }
      console.log(`[Balance Monitor] Found ${activeCampaigns.length} active campaigns to check`);
      const updatePromises = activeCampaigns.map(async (campaign) => {
        try {
          await this.updateCampaignBalance(campaign.id, campaign.walletAddress);
        } catch (error) {
          console.error(`[Balance Monitor] Failed to update balance for campaign ${campaign.id}:`, error);
        }
      });
      await Promise.all(updatePromises);
      console.log("[Balance Monitor] Balance update completed for all campaigns");
    } catch (error) {
      console.error("[Balance Monitor] Error updating campaign balances:", error);
    }
  }
  /**
   * Update balance for a specific campaign
   */
  async updateCampaignBalance(campaignId, walletAddress) {
    try {
      const publicKey = new PublicKey6(walletAddress);
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL2;
      const solPriceUSD = await this.getSOLPriceUSD();
      const balanceUSD = balanceSOL * solPriceUSD;
      console.log(`[Balance Monitor] Campaign ${campaignId}: ${balanceSOL.toFixed(4)} SOL (~$${balanceUSD.toFixed(2)})`);
      await campaignService.updateCampaignAmount(campaignId, balanceUSD);
    } catch (error) {
      console.error(`[Balance Monitor] Error updating balance for ${campaignId}:`, error);
      throw error;
    }
  }
  /**
   * Get SOL price in USD using CoinGecko API
   */
  async getSOLPriceUSD() {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        const price = data.solana.usd;
        console.log(`[Balance Monitor] Current SOL price: $${price}`);
        return price;
      }
      throw new Error("Invalid price data received");
    } catch (error) {
      console.warn("[Balance Monitor] Failed to fetch SOL price from CoinGecko, using fallback:", error.message);
      return 180;
    }
  }
  /**
   * Get balance for a specific wallet (utility method)
   */
  async getWalletBalance(walletAddress) {
    const publicKey = new PublicKey6(walletAddress);
    const balanceLamports = await this.connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL2;
    const solPrice = await this.getSOLPriceUSD();
    const balanceUSD = balanceSOL * solPrice;
    return {
      sol: balanceSOL,
      usd: balanceUSD
    };
  }
};
var balanceMonitorService = new BalanceMonitorService();

// server/services/scheduler.ts
var SchedulerService = class {
  deadlineCheckInterval = null;
  balanceMonitorInterval = null;
  start() {
    this.deadlineCheckInterval = setInterval(async () => {
      try {
        await this.checkCampaignDeadlines();
      } catch (error) {
        console.error("Scheduled deadline check failed:", error);
      }
    }, 5 * 60 * 1e3);
    this.balanceMonitorInterval = setInterval(async () => {
      try {
        await this.updateCampaignBalances();
      } catch (error) {
        console.error("Scheduled balance update failed:", error);
      }
    }, 30 * 1e3);
    console.log("Scheduler service started (deadlines: 5min, balances: 30sec)");
  }
  stop() {
    if (this.deadlineCheckInterval) {
      clearInterval(this.deadlineCheckInterval);
      this.deadlineCheckInterval = null;
    }
    if (this.balanceMonitorInterval) {
      clearInterval(this.balanceMonitorInterval);
      this.balanceMonitorInterval = null;
    }
    console.log("Scheduler service stopped");
  }
  async checkCampaignDeadlines() {
    console.log("Checking campaign deadlines...");
    await campaignService.checkDeadlines();
    console.log("Campaign deadline check completed");
  }
  async updateCampaignBalances() {
    await balanceMonitorService.updateAllCampaignBalances();
  }
};
var schedulerService = new SchedulerService();

// server/routes.ts
async function registerRoutes(app3) {
  app3.get("/api/health", async (req, res) => {
    res.json({ status: "ok", message: "Wendex API is running" });
  });
  app3.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app3.get("/api/projects/featured", async (req, res) => {
    try {
      const projects = await storage.getFeaturedProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured projects" });
    }
  });
  app3.post("/api/helius/validate-token", validateToken);
  app3.use("/api", campaigns_default);
  app3.use("/api", balances_default);
  app3.use("/api/admin", admin_default);
  app3.use("/api", webhook_default);
  const httpServer = createServer(app3);
  initializeWebSocket(httpServer);
  schedulerService.start();
  process.on("SIGTERM", () => {
    schedulerService.stop();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    schedulerService.stop();
    process.exit(0);
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  optimizeDeps: {
    exclude: ["viem"],
    include: ["buffer"]
  },
  define: {
    global: "globalThis",
    "process.env": "import.meta.env",
    "import.meta.env.VITE_HELIUS_API_KEY": JSON.stringify(process.env.HELIUS_API_KEY)
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: ["viem", "viem/chains"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app3, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app3.use(vite.middlewares);
  app3.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app3) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app3.use(express.static(distPath));
  app3.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import dotenv2 from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
dotenv2.config();
console.log("[Server Startup] Environment variables loaded:");
console.log("[Server Startup] - NODE_ENV:", process.env.NODE_ENV);
console.log("[Server Startup] - HELIUS_API_KEY:", process.env.HELIUS_API_KEY ? `${process.env.HELIUS_API_KEY.substring(0, 8)}...` : "NOT SET");
console.log("[Server Startup] - VITE_HELIUS_API_KEY:", process.env.VITE_HELIUS_API_KEY ? `${process.env.VITE_HELIUS_API_KEY.substring(0, 8)}...` : "NOT SET");
console.log("[Server Startup] - HELIUS_RPC_ENDPOINT:", process.env.HELIUS_RPC_ENDPOINT || "NOT SET");
var app2 = express2();
app2.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://firestore.googleapis.com", "https://firebase.googleapis.com", "https://firebasestorage.googleapis.com", "https://api.devnet.solana.com", "https://api.mainnet-beta.solana.com", "https://mainnet.helius-rpc.com", "https://*.helius-rpc.com", "https://api.coingecko.com", "wss:", "ws:"]
    }
  },
  hsts: {
    maxAge: 31536e3,
    includeSubDomains: true,
    preload: true
  }
}));
app2.use(cors({
  origin: process.env.NODE_ENV === "production" ? process.env.ALLOWED_ORIGINS?.split(",") || [] : ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
var generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // requests per window
  message: "Too many requests from this IP"
});
var adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  // Very restrictive for admin
  message: "Too many admin requests from this IP"
});
app2.use("/api", generalLimiter);
app2.use("/api/admin", adminLimiter);
app2.use(express2.json());
app2.use(express2.urlencoded({ extended: false }));
app2.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app2);
  app2.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app2.get("env") === "development") {
    await setupVite(app2, server);
  } else {
    serveStatic(app2);
  }
  const port = process.env.PORT || 3e3;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
