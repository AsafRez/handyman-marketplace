// HandyHub Server-Sent Events (SSE) Real-Time Engine
// Connects to sync server for cross-device updates + local event bus
import { getSyncServerHosts } from './broadcast';

class SSEStreamManager {
  constructor() {
    this.listeners = new Set();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.eventSource = null;
    
    this.hosts = getSyncServerHosts();
  }

  /**
   * Connect to real SSE server + register local listener
   */
  connect(onEvent) {
    this.listeners.add(onEvent);

    if (typeof EventSource === 'undefined') {
      console.warn("📡 SSE not supported in this environment (EventSource is undefined).");
      return () => this.disconnect(onEvent);
    }

    // Try connecting to the real SSE server if not already connected
    if (!this.eventSource) {
      this._connectToServer();
    }

    return () => this.disconnect(onEvent);
  }

  _connectToServer() {
    const probeAndConnect = async () => {
      for (const host of this.hosts) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        try {
          const res = await fetch(`${host}/api/jobs`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            console.log(`📡 SSE found live host: ${host}`);
            this._connectToHost(host);
            return;
          }
        } catch (e) {
          clearTimeout(timeoutId);
        }
      }
      console.warn("📡 SSE could not find any live host, retrying probe in 5s");
      setTimeout(() => probeAndConnect(), 5000);
    };

    probeAndConnect();
  }

  _connectToHost(host) {
    try {
      const es = new EventSource(`${host}/api/events`);

      es.onopen = () => {
        console.log(`📡 SSE connected to ${host}/api/events`);
        this.isConnected = true;
        this.eventSource = es;
        this.reconnectAttempts = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && data.type !== 'CONNECTED') {
            this.listeners.forEach(callback => {
              try {
                callback({ type: data.type, data: data.payload });
              } catch (err) {
                console.error('SSE listener error:', err);
              }
            });
          }
        } catch (e) {}
      };

      es.onerror = () => {
        es.close();
        this.eventSource = null;
        this.isConnected = false;
        console.log("📡 SSE connection lost, re-probing hosts in 5s...");
        setTimeout(() => this._connectToServer(), 5000);
      };
    } catch (e) {
      setTimeout(() => this._connectToServer(), 5000);
    }
  }

  disconnect(onEvent) {
    this.listeners.delete(onEvent);
  }

  /**
   * Emit a local-only SSE event (for same-tab listeners)
   */
  emitSSE(eventType, data) {
    const sseEvent = {
      id: `sse-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    this.listeners.forEach(callback => {
      try {
        callback(sseEvent);
      } catch (err) {
        console.error('SSE listener error:', err);
      }
    });
  }

  getStatus() {
    return {
      connected: this.isConnected,
      activeListeners: this.listeners.size,
      hasEventSource: !!this.eventSource
    };
  }
}

export const sseManager = new SSEStreamManager();
