const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const AIService = require('./ai-service');
const FileWatcher = require('./file-watcher');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;
const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'web')));

// Ensure workspace exists
fs.ensureDirSync(WORKSPACE_DIR);
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'scripts'));
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'properties'));
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'projects'));

// Initialize services
const aiService = new AIService();
const fileWatcher = new FileWatcher(WORKSPACE_DIR);

// Global state
const sessions = new Map();
const projects = new Map();
const robloxConnections = new Map();
const pendingExecutions = [];

// Make io global for other modules
global.io = io;

// ==================== SOCKET.IO (Web Client) ====================

io.on('connection', (socket) => {
  console.log(`[LuaScratch] Web client connected: ${socket.id}`);
  
  const sessionId = uuidv4();
  sessions.set(socket.id, {
    id: sessionId,
    socket: socket,
    currentProject: null,
    robloxConnected: false
  });

  socket.emit('workspace:init', {
    sessionId,
    workspacePath: WORKSPACE_DIR,
    files: fileWatcher.getFileTree()
  });

  // Project management
  socket.on('project:create', async (data) => {
    const projectId = uuidv4();
    const project = {
      id: projectId,
      name: data.name,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      blocks: [],
      connections: [],
      variables: {}
    };
    
    projects.set(projectId, project);
    sessions.get(socket.id).currentProject = projectId;
    
    await saveProject(project);
    socket.emit('project:created', project);
    socket.emit('project:list', Array.from(projects.values()));
    
    console.log(`[LuaScratch] Project created: ${data.name}`);
  });

  socket.on('project:load', (projectId) => {
    const project = projects.get(projectId);
    if (project) {
      sessions.get(socket.id).currentProject = projectId;
      socket.emit('project:loaded', project);
    }
  });

  socket.on('project:list', () => {
    socket.emit('project:list', Array.from(projects.values()));
  });

  socket.on('project:save', async (project) => {
    projects.set(project.id, project);
    await saveProject(project);
    socket.emit('project:saved', project);
  });

  // Block system
  socket.on('block:add', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      const block = {
        id: data.id || uuidv4(),
        type: data.type,
        category: data.category,
        label: data.label,
        code: data.code || '',
        description: data.description || '',
        inputs: data.inputs || [],
        outputs: data.outputs || [],
        parentId: data.parentId || null,
        children: data.children || [],
        position: data.position || { x: 100, y: 100 },
        color: data.color || null,
        icon: data.icon || 'fa-cube',
        createdAt: new Date().toISOString()
      };
      
      project.blocks.push(block);
      await saveProject(project);
      
      socket.emit('block:added', block);
      socket.broadcast.emit('block:added', { projectId: project.id, block });
    }
  });

  socket.on('block:update', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      const block = project.blocks.find(b => b.id === data.id);
      if (block) {
        Object.assign(block, data.updates, { updatedAt: new Date().toISOString() });
        await saveProject(project);
        socket.emit('block:updated', { projectId: project.id, block });
        socket.broadcast.emit('block:updated', { projectId: project.id, block });
      }
    }
  });

  socket.on('block:delete', async (blockId) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      const blockIndex = project.blocks.findIndex(b => b.id === blockId);
      if (blockIndex > -1) {
        project.blocks.splice(blockIndex, 1);
        
        // Remove connections
        project.connections = project.connections.filter(
          c => c.from !== blockId && c.to !== blockId
        );
        
        await saveProject(project);
        socket.emit('block:deleted', blockId);
        socket.broadcast.emit('block:deleted', { projectId: project.id, blockId });
      }
    }
  });

  socket.on('block:connect', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      // Check if connection already exists
      const exists = project.connections.find(
        c => c.from === data.from && c.to === data.to
      );
      
      if (!exists) {
        project.connections.push({ from: data.from, to: data.to });
        
        // Update block parent/child relationships
        const fromBlock = project.blocks.find(b => b.id === data.from);
        const toBlock = project.blocks.find(b => b.id === data.to);
        
        if (fromBlock && toBlock) {
          toBlock.parentId = fromBlock.id;
          if (!fromBlock.children.includes(toBlock.id)) {
            fromBlock.children.push(toBlock.id);
          }
        }
        
        await saveProject(project);
        socket.emit('block:connected', { from: data.from, to: data.to });
        socket.broadcast.emit('block:connected', { projectId: project.id, from: data.from, to: data.to });
      }
    }
  });

  socket.on('block:disconnect', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      project.connections = project.connections.filter(
        c => !(c.from === data.from && c.to === data.to)
      );
      
      const fromBlock = project.blocks.find(b => b.id === data.from);
      const toBlock = project.blocks.find(b => b.id === data.to);
      
      if (fromBlock) {
        fromBlock.children = fromBlock.children.filter(id => id !== data.to);
      }
      if (toBlock) {
        toBlock.parentId = null;
      }
      
      await saveProject(project);
      socket.emit('block:disconnected', data);
    }
  });

  // AI Integration
  socket.on('ai:generate', async (data) => {
    socket.emit('ai:loading', { message: 'Thinking...', stage: 'analyzing' });
    
    try {
      const project = projects.get(sessions.get(socket.id).currentProject);
      const context = project ? buildBlockContext(project.blocks) : '';
      
      const prompt = buildAIPrompt(data.prompt, context, data.mode);
      
      socket.emit('ai:loading', { message: 'Generating code...', stage: 'generating' });
      
      const response = await aiService.generateCode(prompt);
      
      socket.emit('ai:response', {
        code: response.code,
        explanation: response.explanation,
        suggestions: response.suggestions,
        blocks: response.blocks || [],
        originalPrompt: data.prompt
      });
      
    } catch (error) {
      console.error('[AI Error]', error);
      socket.emit('ai:error', { message: error.message });
    }
  });

  socket.on('ai:fix', async (data) => {
    socket.emit('ai:loading', { message: 'Analyzing error...', stage: 'analyzing' });
    
    try {
      const prompt = `Fix this Luau code error:

CODE:
${data.code}

ERROR:
${data.error}

Provide the fixed code and explanation.`;
      
      const response = await aiService.generateCode(prompt);
      
      socket.emit('ai:fixed', {
        code: response.code,
        explanation: response.explanation
      });
      
    } catch (error) {
      socket.emit('ai:error', { message: error.message });
    }
  });

  // Roblox execution
  socket.on('roblox:execute', async (data) => {
    const session = sessions.get(socket.id);
    
    if (robloxConnections.size === 0) {
      socket.emit('console:error', { 
        message: 'Roblox Studio not connected!',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    socket.emit('console:clear');
    socket.emit('console:log', { 
      type: 'info', 
      message: 'Sending to Roblox Studio...',
      timestamp: new Date().toISOString()
    });
    
    // Add to pending executions
    const execId = uuidv4();
    pendingExecutions.push({
      id: execId,
      code: data.code,
      timestamp: Date.now()
    });
    
    // Notify all connected Roblox clients
    io.emit('roblox:executeRequest', {
      executionId: execId,
      code: data.code
    });
    
    socket.emit('console:log', { 
      type: 'success', 
      message: 'Code sent to Roblox Studio',
      timestamp: new Date().toISOString()
    });
  });

  // Console
  socket.on('console:log', (data) => {
    io.emit('console:log', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('console:error', (data) => {
    io.emit('console:error', { ...data, timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    console.log(`[LuaScratch] Client disconnected: ${socket.id}`);
    sessions.delete(socket.id);
  });
});

// ==================== ROBLOX PLUGIN HTTP API ====================

// Connect
app.post('/api/roblox/connect', (req, res) => {
  const { sessionId, studioVersion, placeName, placeId } = req.body;
  
  console.log(`[Roblox] Plugin connected: ${placeName} (v${studioVersion})`);
  
  robloxConnections.set(sessionId, {
    sessionId,
    placeName,
    placeId,
    connectedAt: new Date().toISOString()
  });
  
  // Notify all web clients
  io.emit('roblox:connected', { 
    sessionId, 
    placeName,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    success: true, 
    message: 'Connected to LuaScratch',
    serverTime: new Date().toISOString()
  });
});

// Disconnect
app.post('/api/roblox/disconnect', (req, res) => {
  const { sessionId } = req.body;
  
  console.log(`[Roblox] Plugin disconnected: ${sessionId}`);
  
  robloxConnections.delete(sessionId);
  
  io.emit('roblox:disconnected', { 
    sessionId,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Sync game tree
app.post('/api/roblox/sync', async (req, res) => {
  const { sessionId, gameData } = req.body;
  
  console.log(`[Roblox] Game tree synced: ${gameData.scripts?.length || 0} scripts`);
  
  // Save to workspace
  await fileWatcher.syncFromRoblox(gameData);
  
  io.emit('roblox:gameTree', gameData.tree);
  io.emit('file:synced', fileWatcher.getFileTree());
  
  res.json({ success: true, scriptsReceived: gameData.scripts?.length || 0 });
});

// Console output from Roblox
app.post('/api/roblox/console', (req, res) => {
  const { sessionId, message, type } = req.body;
  
  io.emit('console:log', {
    type: type || 'log',
    message,
    source: 'roblox',
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Error from Roblox
app.post('/api/roblox/error', (req, res) => {
  const { sessionId, message, stack, code } = req.body;
  
  console.log(`[Roblox Error] ${message}`);
  
  io.emit('console:error', {
    message,
    stack,
    source: 'roblox',
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Execution result from Roblox
app.post('/api/roblox/executionResult', (req, res) => {
  const { executionId, success, error, result } = req.body;
  
  // Remove from pending
  const index = pendingExecutions.findIndex(e => e.id === executionId);
  if (index > -1) {
    pendingExecutions.splice(index, 1);
  }
  
  if (success) {
    io.emit('console:log', {
      type: 'success',
      message: `Execution completed: ${result || 'OK'}`,
      source: 'roblox',
      timestamp: new Date().toISOString()
    });
  } else {
    io.emit('console:error', {
      message: `Execution failed: ${error}`,
      source: 'roblox',
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ success: true });
});

// Poll for pending executions
app.get('/api/execute/poll', (req, res) => {
  // Return oldest pending execution
  if (pendingExecutions.length > 0) {
    const exec = pendingExecutions.shift();
    res.json({ code: exec.code, id: exec.id });
  } else {
    res.json({});
  }
});

// Legacy endpoint for pending executions
app.get('/api/roblox/pendingExecutions', (req, res) => {
  const { sessionId } = req.query;
  
  if (pendingExecutions.length > 0) {
    const execs = pendingExecutions.splice(0, 5); // Return up to 5
    res.json({ executions: execs });
  } else {
    res.json({ executions: [] });
  }
});

// Get game tree
app.get('/api/roblox/gameTree', (req, res) => {
  res.json({ 
    connected: robloxConnections.size > 0,
    connections: Array.from(robloxConnections.values())
  });
});

// Studio file upload
app.post('/api/studio/file', async (req, res) => {
  const { path: filePath, content, properties } = req.body;
  
  try {
    await fileWatcher.writeFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Studio selection upload
app.post('/api/studio/selection', (req, res) => {
  const { sessionId, selection } = req.body;
  
  console.log(`[Roblox] Selection received: ${selection.length} items`);
  
  io.emit('studio:selection', { sessionId, selection });
  
  res.json({ success: true });
});

// ==================== HELPER FUNCTIONS ====================

async function saveProject(project) {
  const projectPath = path.join(WORKSPACE_DIR, 'projects', `${project.id}.json`);
  await fs.ensureDir(path.dirname(projectPath));
  await fs.writeJson(projectPath, project, { spaces: 2 });
}

function buildBlockContext(blocks) {
  if (!blocks || blocks.length === 0) return 'No blocks yet.';
  
  return blocks.map(block => {
    return `- ${block.label} (${block.type}): ${block.description || 'No description'}`;
  }).join('\n');
}

function buildAIPrompt(userPrompt, blockContext, mode) {
  return `You are LuaScratch AI, an expert Roblox/Luau developer.

CURRENT PROJECT BLOCKS:
${blockContext}

USER REQUEST:
${userPrompt}

Generate clean, working Luau code. Respond with JSON:
{
  "code": "the luau code",
  "explanation": "what it does",
  "suggestions": ["idea 1", "idea 2"],
  "blocks": [{"type": "...", "label": "...", "category": "...", "code": "..."}]
}`;
}

// Load existing projects on startup
async function loadProjects() {
  const projectsDir = path.join(WORKSPACE_DIR, 'projects');
  await fs.ensureDir(projectsDir);
  
  const files = await fs.readdir(projectsDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const project = await fs.readJson(path.join(projectsDir, file));
        projects.set(project.id, project);
      } catch (e) {
        console.log(`[LuaScratch] Failed to load project: ${file}`);
      }
    }
  }
  
  console.log(`[LuaScratch] Loaded ${projects.size} projects`);
}

// Start server
server.listen(PORT, async () => {
  await loadProjects();
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎮 LuaScratch Server v2.0                  ║
║              AI-Powered Visual Programming for Roblox        ║
╠══════════════════════════════════════════════════════════════╣
║  Web Interface: http://localhost:${PORT}                        ║
║  AI Model: deepseek/DeepSeek-V3-0324                         ║
║  Projects: ${projects.size.toString().padEnd(3)}                                             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
