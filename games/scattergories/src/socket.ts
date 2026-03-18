import { io, Socket } from 'socket.io-client';

// In production, connect to same origin (server serves both API and static files)
// In dev, Vite proxy forwards to the backend
export const socket: Socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});
