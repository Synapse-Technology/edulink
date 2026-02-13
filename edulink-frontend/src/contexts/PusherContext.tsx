import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Pusher, { Channel } from 'pusher-js';
import config from '../config';

interface PusherContextType {
  pusher: Pusher | null;
  connectionState: string;
  subscribe: (channelName: string) => Channel | null;
  unsubscribe: (channelName: string) => void;
}

const PusherContext = createContext<PusherContextType>({ 
  pusher: null,
  connectionState: 'disconnected',
  subscribe: () => null,
  unsubscribe: () => {},
});

export const usePusherContext = () => useContext(PusherContext);

export const PusherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const subscriptionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!config.pusher.key) {
      console.warn('[Pusher] Key is missing in config');
      return;
    }

    console.log('[Pusher] Initializing singleton...');
    // Enable logging in development
    if (import.meta.env.DEV) {
      Pusher.logToConsole = true;
    }

    const pusherInstance = new Pusher(config.pusher.key, {
      cluster: config.pusher.cluster,
      forceTLS: true,
      enabledTransports: ['ws', 'wss'],
    });

    pusherInstance.connection.bind('state_change', (states: any) => {
      console.log(`[Pusher] Connection state: ${states.current}`);
      setConnectionState(states.current);
    });

    pusherInstance.connection.bind('error', (err: any) => {
      console.error('[Pusher] Connection error:', err);
    });

    setPusher(pusherInstance);

    return () => {
      console.log('[Pusher] Disconnecting...');
      pusherInstance.disconnect();
    };
  }, []);

  const subscribe = useCallback((channelName: string) => {
    if (!pusher) return null;

    // Increment reference count
    subscriptionsRef.current[channelName] = (subscriptionsRef.current[channelName] || 0) + 1;
    
    console.log(`[Pusher] Subscribing to ${channelName}. Ref count: ${subscriptionsRef.current[channelName]}`);
    return pusher.subscribe(channelName);
  }, [pusher]);

  const unsubscribe = useCallback((channelName: string) => {
    if (!pusher) return;

    // Decrement reference count
    if (subscriptionsRef.current[channelName]) {
      subscriptionsRef.current[channelName]--;
      console.log(`[Pusher] Unsubscribing from ${channelName}. Ref count: ${subscriptionsRef.current[channelName]}`);
      
      // Only actually unsubscribe if no one else is listening
      if (subscriptionsRef.current[channelName] <= 0) {
        console.log(`[Pusher] No more listeners for ${channelName}. Actual unsubscribe.`);
        pusher.unsubscribe(channelName);
        delete subscriptionsRef.current[channelName];
      }
    }
  }, [pusher]);

  return (
    <PusherContext.Provider value={{ pusher, connectionState, subscribe, unsubscribe }}>
      {children}
    </PusherContext.Provider>
  );
};
