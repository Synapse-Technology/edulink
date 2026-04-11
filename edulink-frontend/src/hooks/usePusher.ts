import { useEffect, useRef, useState } from 'react';
import { Channel } from 'pusher-js';
import { usePusherContext } from '../contexts/PusherContext';

interface UsePusherOptions<T = any> {
  /**
   * Fallback polling function when Pusher connection is unavailable.
   * Called every `pollingInterval` ms if Pusher event not received for `fallbackDelay` ms.
   */
  fallbackPoll?: () => Promise<T | null>;
  /**
   * Delay before activating fallback polling (ms). Default: 10000ms.
   */
  fallbackDelay?: number;
  /**
   * Polling interval when fallback is active (ms). Default: 3000ms.
   */
  pollingInterval?: number;
}

/**
 * Custom hook to handle Pusher real-time subscriptions with fallback polling.
 * 
 * If Pusher event not received within `fallbackDelay`, starts polling `fallbackPoll()` 
 * every `pollingInterval` ms automatically. Stops polling when Pusher reconnects.
 */
export const usePusher = <T = any>(
  channelName: string | undefined,
  eventName: string,
  onEvent: (data: T) => void,
  options: UsePusherOptions<T> = {}
) => {
  const { 
    fallbackPoll, 
    fallbackDelay = 10000, 
    pollingInterval = 3000 
  } = options;
  
  const { pusher, subscribe, unsubscribe } = usePusherContext();
  const channelRef = useRef<Channel | null>(null);
  const callbackRef = useRef(onEvent);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Update the ref whenever onEvent changes so the listener always uses the latest logic
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  // Fallback polling logic
  useEffect(() => {
    if (!isPolling || !fallbackPoll) return;

    const poll = async () => {
      try {
        const data = await fallbackPoll();
        if (data) {
          callbackRef.current(data);
        }
      } catch (error) {
        console.warn(`Fallback poll failed for ${channelName}:${eventName}:`, error);
      }
    };

    pollingIntervalRef.current = setInterval(poll, pollingInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPolling, fallbackPoll, channelName, eventName, pollingInterval]);

  useEffect(() => {
    if (!pusher || !channelName) return;

    // Use the central subscription manager
    const channel = subscribe(channelName);
    if (!channel) return;
    
    channelRef.current = channel;

    // Internal handler that calls the latest version of onEvent
    const handler = (data: T) => {
      // Event received: reset fallback timer and stop polling
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      setIsPolling(false);
      callbackRef.current(data);
    };

    // Restart fallback timer on subscription
    const startFallbackTimer = () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      
      fallbackTimeoutRef.current = setTimeout(() => {
        if (fallbackPoll) {
          console.warn(`Pusher event not received for ${fallbackDelay}ms on ${channelName}:${eventName}. Starting fallback polling.`);
          setIsPolling(true);
        }
      }, fallbackDelay);
    };

    // Bind to the event
    channel.bind(eventName, handler);
    startFallbackTimer();

    // Cleanup
    return () => {
      if (channel) {
        channel.unbind(eventName, handler);
        // Use the central unsubscription manager
        unsubscribe(channelName);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      setIsPolling(false);
      channelRef.current = null;
    };
  }, [pusher, channelName, eventName, subscribe, unsubscribe, fallbackPoll, fallbackDelay]);

  return { isPolling };
};
