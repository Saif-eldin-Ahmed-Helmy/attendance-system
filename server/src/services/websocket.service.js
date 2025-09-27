const WebSocket = require('ws');
const AppError = require('../utils/AppError');

/**
 * WebSocket Service
 * Handles real-time communication between server and clients
 */
class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.reconnectionAttempts = new Map();
    this.maxReconnectionAttempts = 5;
    this.reconnectionDelay = 3000; // 3 seconds
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   * @returns {Promise<void>}
   */
  initialize(server) {
    try {
      this.wss = new WebSocket.Server({ server });
      this.setupEventHandlers();
      console.log('WebSocket Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebSocket Service:', error);
      throw new AppError('WebSocket initialization failed', 500, 'WEBSOCKET_INIT_ERROR');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server Error:', error);
    });

    // Cleanup disconnected clients periodically
    setInterval(() => {
      this.cleanupDisconnectedClients();
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket instance
   * @param {Object} req - HTTP request object
   */
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true
    };

    this.clients.set(clientId, clientInfo);
    console.log(`New WebSocket client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection',
      message: 'Welcome! Connection established successfully.',
      clientId,
      timestamp: new Date().toISOString()
    });

    // Setup client event handlers
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error) => {
      this.handleError(clientId, error);
    });

    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = new Date();
      }
    });

    // Start ping interval for this client
    this.startPingInterval(clientId);
  }

  /**
   * Handle incoming WebSocket message
   * @param {string} clientId - Client ID
   * @param {Buffer|string} message - Received message
   */
  handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch {
        parsedMessage = { type: 'text', data: message.toString() };
      }

      console.log(`Message from client ${clientId}:`, parsedMessage);

      // Handle different message types
      switch (parsedMessage.type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        case 'broadcast':
          this.broadcastMessage(parsedMessage.data, clientId);
          break;

        case 'attendance_update':
          this.handleAttendanceUpdate(parsedMessage.data);
          break;

        default:
          // Echo message to all other clients
          this.broadcastMessage(parsedMessage, clientId);
      }
    } catch (error) {
      console.error(`Error handling message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to process message',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle client disconnection
   * @param {string} clientId - Client ID
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Client disconnected: ${clientId}, Code: ${code}, Reason: ${reason}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle WebSocket errors
   * @param {string} clientId - Client ID
   * @param {Error} error - Error object
   */
  handleError(clientId, error) {
    console.error(`WebSocket error for client ${clientId}:`, error);
    const client = this.clients.get(clientId);
    if (client) {
      client.isAlive = false;
    }
  }

  /**
   * Send message to specific client
   * @param {string} clientId - Client ID
   * @param {Object} message - Message to send
   * @returns {boolean} Success status
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      client.ws.send(messageString);
      return true;
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   * @param {string} excludeClientId - Client ID to exclude from broadcast
   * @returns {number} Number of clients that received the message
   */
  broadcastMessage(message, excludeClientId = null) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (clientId === excludeClientId) continue;

      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Send attendance update to all clients
   * @param {Object} attendanceData - Attendance data
   */
  handleAttendanceUpdate(attendanceData) {
    const message = {
      type: 'attendance_notification',
      data: attendanceData,
      timestamp: new Date().toISOString()
    };

    this.broadcastMessage(message);
  }

  /**
   * Send system notification to all clients
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   * @param {string} type - Notification type (info, success, warning, error)
   */
  sendSystemNotification(title, content, type = 'info') {
    const message = {
      type: 'system_notification',
      data: {
        title,
        content,
        notificationType: type,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcastMessage(message);
  }

  /**
   * Start ping interval for client connection health check
   * @param {string} clientId - Client ID
   */
  startPingInterval(clientId) {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }

      if (!client.isAlive) {
        console.log(`Terminating inactive client: ${clientId}`);
        client.ws.terminate();
        this.clients.delete(clientId);
        clearInterval(interval);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Clean up disconnected clients
   */
  cleanupDisconnectedClients() {
    const disconnectedClients = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.CLOSED || client.ws.readyState === WebSocket.CLOSING) {
        disconnectedClients.push(clientId);
      }
    }

    disconnectedClients.forEach(clientId => {
      this.clients.delete(clientId);
    });

    if (disconnectedClients.length > 0) {
      console.log(`Cleaned up ${disconnectedClients.length} disconnected clients`);
    }
  }

  /**
   * Generate unique client ID
   * @returns {string} Unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connected clients count
   * @returns {number} Number of connected clients
   */
  getConnectedClientsCount() {
    return this.clients.size;
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStatistics() {
    const now = new Date();
    const clientStats = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      connectionDuration: now - client.connectedAt,
      lastPing: client.lastPing,
      isAlive: client.isAlive
    }));

    return {
      totalClients: this.clients.size,
      activeClients: clientStats.filter(c => c.isAlive).length,
      clients: clientStats
    };
  }

  /**
   * Shutdown WebSocket service
   */
  shutdown() {
    if (this.wss) {
      console.log('Shutting down WebSocket service...');

      // Close all client connections
      for (const [clientId, client] of this.clients.entries()) {
        client.ws.close(1001, 'Server shutting down');
      }

      this.wss.close(() => {
        console.log('WebSocket service shut down successfully');
      });

      this.clients.clear();
    }
  }
}

module.exports = new WebSocketService();
