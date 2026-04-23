// Sample WebSocket STOMP client for TicketRush seat map realtime updates.
// Install first: npm i @stomp/stompjs sockjs-client

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export function connectSeatRealtime({ eventId, token, onSeatStatusChanged }) {
  const socketFactory = () => new SockJS('http://localhost:8080/ws-ticket');

  const client = new Client({
    webSocketFactory: socketFactory,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/event/${eventId}`, message => {
        const payload = JSON.parse(message.body);
        // payload = { seatId, status, eventId }
        onSeatStatusChanged(payload);
      });
    },
    onStompError: frame => {
      console.error('STOMP error', frame.headers['message'], frame.body);
    },
  });

  client.activate();

  return () => {
    client.deactivate();
  };
}

// Example usage in React component:
// const stop = connectSeatRealtime({
//   eventId: 101,
//   token,
//   onSeatStatusChanged: ({ seatId, status }) => {
//     setSeatMap(prev => prev.map(seat =>
//       seat.id === seatId ? { ...seat, status } : seat
//     ));
//   },
// });
// return () => stop();
