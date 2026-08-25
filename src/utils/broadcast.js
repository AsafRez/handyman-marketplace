// HandyHub Cross-Emulator Real-Time Broadcast & SSE Transport Engine

export const getSyncServerHosts = () => {
  if (typeof window === 'undefined') return ['http://localhost:3001'];
  const isAndroid = window.Capacitor?.platform === 'android' || 
                    /Android/i.test(navigator.userAgent) || 
                    window.location.hostname === '10.0.2.2';
  const localHosts = isAndroid
    ? ['http://10.0.2.2:3001', 'http://192.168.1.188:3001', 'http://localhost:3001']
    : ['http://localhost:3001', 'http://192.168.1.188:3001', 'http://10.0.2.2:3001'];

  const prodUrl = import.meta.env.VITE_SYNC_SERVER_URL;
  return prodUrl ? [prodUrl, ...localHosts] : localHosts;
};

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('handyhub_marketplace_events')
  : null;

/**
 * Connects EventSource SSE listener to the running sync server
 */
export const initializeSSESync = (onMessage) => {
  const hosts = getSyncServerHosts();
  hosts.forEach(host => {
    try {
      const eventSource = new EventSource(`${host}/api/events`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.type && parsed.type !== 'CONNECTED') {
            onMessage(parsed);
          }
        } catch (e) {}
      };
      eventSource.onerror = () => {
        // Close eventSource on connection error to avoid continuous reconnect loops
        eventSource.close();
      };
    } catch (err) {}
  });
};

/**
 * Broadcasts an event locally (BroadcastChannel) AND across the network (HTTP SSE Relay)
 */
export const broadcastEvent = (type, payload) => {
  const event = {
    type,
    payload,
    senderId: typeof window !== 'undefined' ? window.name || 'emulator' : 'server',
    timestamp: Date.now()
  };

  // 1. Local BroadcastChannel
  if (channel) {
    try {
      channel.postMessage(event);
    } catch (e) {}
  }

  // 2. LocalStorage Event Trigger (Same-tab/browser fallback)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('handyhub_last_event', JSON.stringify(event));
    } catch (e) {}
  }

  // 3. HTTP Network Relay to SSE Sync Server (Cross-Emulator Sync)
  getSyncServerHosts().forEach(host => {
    fetch(`${host}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(() => {});
  });
};

/**
 * Subscribes to real-time events across BroadcastChannel and LocalStorage (for cross-tab sync)
 * Network SSE streaming is managed centrally by MarketplaceContext
 */
export const subscribeToEvents = (callback) => {
  // 1. BroadcastChannel Listener
  const handleBroadcast = (event) => {
    if (event.data) callback(event.data);
  };
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // 2. Storage Listener
  const handleStorage = (e) => {
    if (e.key === 'handyhub_last_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (channel) channel.removeEventListener('message', handleBroadcast);
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };
};

/**
 * Web Audio API synthesizer for sound effects
 */
export const playSoundEffect = (type = 'incoming') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'incoming') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};
