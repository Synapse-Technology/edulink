import { useEffect, useRef } from 'react';
import { Channel } from 'pusher-js';
import { usePusherContext } from '../contexts/PusherContext';

/**
 * Custom hook to handle Pusher real-time subscriptions using a global singleton
 * and a robust reference-counting subscription manager.
 */
export const usePusher = <T = any>(
  channelName: string | undefined,
  eventName: string,
  onEvent: (data: T) => void
) => {
  const { pusher, subscribe, unsubscribe } = usePusherContext();
  const channelRef = useRef<Channel | null>(null);
  const callbackRef = useRef(onEvent);

  // Update the ref whenever onEvent changes so the listener always uses the latest logic
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!pusher || !channelName) return;

    // Use the central subscription manager
    const channel = subscribe(channelName);
    if (!channel) return;
    
    channelRef.current = channel;

    // Internal handler that calls the latest version of onEvent
    const handler = (data: T) => {
      callbackRef.current(data);
    };

    // Bind to the event
    channel.bind(eventName, handler);

    // Cleanup
    return () => {
      if (channel) {
        channel.unbind(eventName, handler);
        // Use the central unsubscription manager
        unsubscribe(channelName);
      }
      channelRef.current = null;
    };
  }, [pusher, channelName, eventName, subscribe, unsubscribe]);

  return {
    pusher,
    channel: channelRef.current,
  };
};
