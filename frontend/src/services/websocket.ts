const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

type MessageHandler = (data: any) => void;

export class TripWebSocketClient {
  private ws: WebSocket | null = null;
  private tripId: string;
  private userId?: string;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: any = null;

  constructor(tripId: string, userId?: string) {
    this.tripId = tripId;
    this.userId = userId;
  }

  connect(): void {
    const url = `${WS_BASE_URL}/ws/trips/${this.tripId}${this.userId ? `?user_id=${this.userId}` : ''}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[WS] Connected to trip channel: ${this.tripId}`);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        this.handlers.forEach((h) => h(parsed));
      } catch (e) {
        console.error('[WS] Failed to parse message:', event.data);
      }
    };

    this.ws.onclose = () => {
      console.log(`[WS] Disconnected from trip channel: ${this.tripId}. Reconnecting in 3s...`);
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.warn('[WS] Error:', err);
    };
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
