class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private shouldReconnect = true;
  private url: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.emit('connected', null);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected', null);
      
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  subscribeToCampaign(campaignId: string) {
    this.send({ type: 'subscribe', campaignId });
  }

  unsubscribeFromCampaign(campaignId: string) {
    this.send({ type: 'unsubscribe', campaignId });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket client ID:', data.clientId);
        break;
      case 'campaign_update':
        this.emit('campaign_update', data.campaign);
        break;
      case 'new_contribution':
        this.emit('new_contribution', data.contribution);
        break;
      case 'pong':
        // Handle pong response
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }
}

export const wsService = new WebSocketService();