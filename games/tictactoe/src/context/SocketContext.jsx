import { createContext, useContext } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL || '');

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
