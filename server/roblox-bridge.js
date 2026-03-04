const { v4: uuidv4 } = require('uuid');

class RobloxBridge {
  constructor() {
    this.pendingExecutions = new Map();
    this.executionResults = new Map();
    this.gameTree = null;
    this.connectedSessions = new Set();
    
    console.log('[RobloxBridge] Initialized');
  }

  async execute(code, sessionId) {
    return new Promise((resolve, reject) => {
      const executionId = uuidv4();
      
      // Store pending execution
      this.pendingExecutions.set(executionId, {
        sessionId,
        code,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingExecutions.has(executionId)) {
          this.pendingExecutions.delete(executionId);
          reject(new Error('Execution timeout - Roblox Studio may not be connected'));
        }
      }, 30000); // 30 second timeout
      
      // Emit to all connected clients (Roblox plugin will pick this up)
      if (global.io) {
        global.io.emit('roblox:executeRequest', {
          executionId,
          sessionId,
          code
        });
      }
      
      console.log(`[RobloxBridge] Execution queued: ${executionId}`);
    });
  }

  handleExecutionResult(executionId, result) {
    const pending = this.pendingExecutions.get(executionId);
    
    if (pending) {
      this.pendingExecutions.delete(executionId);
      
      if (result.error) {
        pending.reject(new Error(result.error));
      } else {
        this.executionResults.set(executionId, {
          ...result,
          timestamp: Date.now()
        });
        pending.resolve(result);
      }
      
      console.log(`[RobloxBridge] Execution completed: ${executionId}`);
    }
  }

  handleConsoleOutput(sessionId, data) {
    // Forward console output to appropriate session
    if (global.io) {
      global.io.emit('console:log', {
        type: data.type || 'log',
        message: data.message,
        source: 'roblox',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleConsoleError(sessionId, error) {
    if (global.io) {
      global.io.emit('console:error', {
        message: error.message,
        stack: error.stack,
        source: 'roblox',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
  }

  setGameTree(tree) {
    this.gameTree = tree;
    console.log('[RobloxBridge] Game tree updated');
    
    if (global.io) {
      global.io.emit('roblox:gameTree', tree);
    }
  }

  getGameTree() {
    return this.gameTree || {
      name: 'Game',
      children: [],
      notLoaded: true
    };
  }

  connectSession(sessionId) {
    this.connectedSessions.add(sessionId);
    console.log(`[RobloxBridge] Session connected: ${sessionId}`);
    
    if (global.io) {
      global.io.emit('roblox:status', {
        sessionId,
        connected: true
      });
    }
  }

  disconnectSession(sessionId) {
    this.connectedSessions.delete(sessionId);
    console.log(`[RobloxBridge] Session disconnected: ${sessionId}`);
    
    if (global.io) {
      global.io.emit('roblox:status', {
        sessionId,
        connected: false
      });
    }
  }

  isConnected(sessionId) {
    return this.connectedSessions.has(sessionId);
  }

  // Generate execution script that will be sent to Roblox
  generateExecutionScript(code, executionId) {
    return `
-- LuaScratch Execution: ${executionId}
local success, result = pcall(function()
${code}
end)

if success then
  game:GetService("HttpService"):PostAsync(
    "http://localhost:3000/api/roblox/executionResult",
    game:GetService("HttpService"):JSONEncode({
      executionId = "${executionId}",
      success = true,
      result = tostring(result)
    })
  )
else
  game:GetService("HttpService"):PostAsync(
    "http://localhost:3000/api/roblox/executionResult",
    game:GetService("HttpService"):JSONEncode({
      executionId = "${executionId}",
      success = false,
      error = tostring(result)
    })
  )
end
`;
  }

  // Clean up old execution results
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, result] of this.executionResults) {
      if (now - result.timestamp > maxAge) {
        this.executionResults.delete(id);
      }
    }
  }
}

// Auto cleanup every minute
setInterval(() => {
  if (global.robloxBridge) {
    global.robloxBridge.cleanup();
  }
}, 60000);

module.exports = RobloxBridge;
