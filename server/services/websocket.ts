import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db, collections } from '../lib/firebase.js';

interface WSClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.setupFirestoreListeners();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = Math.random().toString(36).substring(7);
      const client: WSClient = {
        ws,
        subscriptions: new Set()
      };
      
      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected', clientId }));
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.campaignId) {
          client.subscriptions.add(message.campaignId);
          console.log(`Client ${clientId} subscribed to campaign ${message.campaignId}`);
        }
        break;
      case 'unsubscribe':
        if (message.campaignId) {
          client.subscriptions.delete(message.campaignId);
          console.log(`Client ${clientId} unsubscribed from campaign ${message.campaignId}`);
        }
        break;
      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  private setupFirestoreListeners() {
    // Listen for campaign updates
    db.collection(collections.campaigns).onSnapshot((snapshot) => {
      console.log('Real-time campaigns listener: received', snapshot.size, 'documents');
      snapshot.docChanges().forEach((change) => {
        const campaign = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'modified' || change.type === 'added') {
          this.broadcastToCampaignSubscribers(campaign.id, {
            type: 'campaign_update',
            campaign
          });
        }
      });
    });

    // Listen for new contributions
    db.collection(collections.contributions).onSnapshot((snapshot) => {
      console.log('Real-time contributions listener: received', snapshot.size, 'documents');
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const contribution = { id: change.doc.id, ...change.doc.data() };
          this.broadcastToCampaignSubscribers(contribution.campaignId, {
            type: 'new_contribution',
            contribution
          });
        }
      });
    });
  }

  private broadcastToCampaignSubscribers(campaignId: string, data: any) {
    this.clients.forEach((client) => {
      if (client.subscriptions.has(campaignId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }

  public broadcast(data: any) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}

export let wsService: WebSocketService;

export function initializeWebSocket(server: Server) {
  wsService = new WebSocketService(server);
  return wsService;
}