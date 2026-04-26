import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { getAuthSession } from '../../auth/utils/authStorage';

export interface SeatRealtimeUpdate {
  eventId: number;
  seatId: number;
  seatCode: string;
  status: 'AVAILABLE' | 'LOCKED' | 'SOLD';
}

interface ConnectSeatRealtimeOptions {
  eventId: number;
  onSeatStatusChanged: (payload: SeatRealtimeUpdate) => void;
}

export function connectSeatRealtime({ eventId, onSeatStatusChanged }: ConnectSeatRealtimeOptions): () => void {
  const { token } = getAuthSession();
  if (!token || !Number.isFinite(eventId)) {
    return () => {};
  }

  let subscription: StompSubscription | null = null;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const client = new Client({
    brokerURL: `${wsProtocol}//${window.location.host}/ws-ticket`,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 3000,
    onConnect: () => {
      subscription = client.subscribe(`/topic/event/${eventId}`, (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body) as SeatRealtimeUpdate;
          onSeatStatusChanged(payload);
        } catch {
          // Ignore malformed realtime payloads.
        }
      });
    },
    onStompError: () => {
      // Keep silent in UI, but force reconnect by built-in reconnectDelay.
    },
    onWebSocketClose: () => {
      // Connection drops can happen during backend restart; Client auto-reconnects.
    },
  });

  client.activate();

  return () => {
    try {
      subscription?.unsubscribe();
    } catch {
      // Ignore unsubscribe errors.
    }
    void client.deactivate();
  };
}
