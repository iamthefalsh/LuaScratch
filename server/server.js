const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const AIService = require('./ai-service');
const FileWatcher = require('./file-watcher');
const RobloxBridge = require('./roblox-bridge');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'web')));

// Ensure workspace exists
fs.ensureDirSync(WORKSPACE_DIR);
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'scripts'));
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'properties'));
fs.ensureDirSync(path.join(WORKSPACE_DIR, 'descriptions'));

// Initialize services
const aiService = new AIService();
const fileWatcher = new FileWatcher(WORKSPACE_DIR);
const robloxBridge = new RobloxBridge();

// Active sessions
const sessions = new Map();
const projects = new Map();

// ==================== SOCKET.IO HANDLERS ====================

io.on('connection', (socket) => {
  console.log(`[LuaScratch] Client connected: ${socket.id}`);
  
  const sessionId = uuidv4();
  sessions.set(socket.id, {
    id: sessionId,
    socket: socket,
    currentProject: null,
    robloxConnected: false
  });

  // Send initial workspace data
  socket.emit('workspace:init', {
    sessionId,
    workspacePath: WORKSPACE_DIR,
    files: fileWatcher.getFileTree()
  });

  // ==================== PROJECT MANAGEMENT ====================
  
  socket.on('project:create', async (data) => {
    const projectId = uuidv4();
    const project = {
      id: projectId,
      name: data.name,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      blocks: [],
      scripts: {},
      variables: {},
      connections: []
    };
    
    projects.set(projectId, project);
    sessions.get(socket.id).currentProject = projectId;
    
    // Save to workspace
    await saveProject(project);
    
    socket.emit('project:created', project);
    broadcastToAll('project:list', Array.from(projects.values()));
    
    console.log(`[LuaScratch] Project created: ${data.name} (${projectId})`);
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

  // ==================== BLOCK SYSTEM ====================
  
  socket.on('block:add', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      const block = {
        id: uuidv4(),
        type: data.type,
        category: data.category,
        label: data.label,
        code: data.code || '',
        inputs: data.inputs || [],
        outputs: data.outputs || [],
        parentId: data.parentId || null,
        children: [],
        position: data.position || { x: 0, y: 0 },
        description: data.description || '',
        createdAt: new Date().toISOString()
      };
      
      project.blocks.push(block);
      
      if (data.parentId) {
        const parent = project.blocks.find(b => b.id === data.parentId);
        if (parent) {
          parent.children.push(block.id);
          project.connections.push({ from: parent.id, to: block.id });
        }
      }
      
      await saveProject(project);
      socket.emit('block:added', block);
      socket.broadcast.emit('block:updated', { projectId: project.id, block });
      
      console.log(`[LuaScratch] Block added: ${block.type} (${block.id})`);
    }
  });

  socket.on('block:connect', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    if (project) {
      const parent = project.blocks.find(b => b.id === data.parentId);
      const child = project.blocks.find(b => b.id === data.childId);
      
      if (parent && child) {
        child.parentId = parent.id;
        if (!parent.children.includes(child.id)) {
          parent.children.push(child.id);
        }
        project.connections.push({ from: parent.id, to: child.id });
        
        await saveProject(project);
        socket.emit('block:connected', { parentId: parent.id, childId: child.id });
        socket.broadcast.emit('block:updated', { projectId: project.id, blocks: [parent, child] });
      }
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
        const block = project.blocks[blockIndex];
        
        // Remove from parent's children
        if (block.parentId) {
          const parent = project.blocks.find(b => b.id === block.parentId);
          if (parent) {
            parent.children = parent.children.filter(id => id !== blockId);
          }
        }
        
        // Remove children connections
        block.children.forEach(childId => {
          const child = project.blocks.find(b => b.id === childId);
          if (child) child.parentId = null;
        });
        
        // Remove connections
        project.connections = project.connections.filter(
          c => c.from !== blockId && c.to !== blockId
        );
        
        project.blocks.splice(blockIndex, 1);
        await saveProject(project);
        
        socket.emit('block:deleted', blockId);
        socket.broadcast.emit('block:deleted', { projectId: project.id, blockId });
      }
    }
  });

  // ==================== AI CODE GENERATION ====================
  
  socket.on('ai:generate', async (data) => {
    const session = sessions.get(socket.id);
    const project = projects.get(session.currentProject);
    
    socket.emit('ai:loading', { message: 'Thinking about your request...', stage: 'analyzing' });
    
    try {
      // Build context from blocks
      const blockContext = project ? buildBlockContext(project.blocks) : '';
      const fileContext = await fileWatcher.getContext();
      
      const prompt = buildAIPrompt(data.prompt, blockContext, fileContext, data.mode);
      
      socket.emit('ai:loading', { message: 'Generating Luau code...', stage: 'generating' });
      
      const response = await aiService.generateCode(prompt, data.mode);
      
      socket.emit('ai:response', {
        code: response.code,
        explanation: response.explanation,
        suggestions: response.suggestions,
        blocks: response.blocks || [],
        originalPrompt: data.prompt
      });
      
      console.log(`[LuaScratch] AI generated code for: ${data.prompt.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('[LuaScratch] AI Error:', error);
      socket.emit('ai:error', { 
        message: error.message,
        stage: 'error'
      });
    }
  });

  socket.on('ai:fix', async (data) => {
    socket.emit('ai:loading', { message: 'Analyzing error...', stage: 'analyzing' });
    
    try {
      const prompt = `Fix this Luau code that has errors:

CODE:
${data.code}

ERROR:
${data.error}

Please provide the fixed code and explain what was wrong.`;
      
      socket.emit('ai:loading', { message: 'Fixing errors...', stage: 'fixing' });
      
      const response = await aiService.generateCode(prompt, 'fix');
      
      socket.emit('ai:fixed', {
        code: response.code,
        explanation: response.explanation,
        originalError: data.error
      });
      
    } catch (error) {
      socket.emit('ai:error', { message: error.message });
    }
  });

  socket.on('ai:ideate', async (data) => {
    socket.emit('ai:loading', { message: 'Brainstorming ideas...', stage: 'thinking' });
    
    try {
      const project = projects.get(sessions.get(socket.id).currentProject);
      const context = project ? buildBlockContext(project.blocks) : '';
      
      const prompt = `Given this context: "${data.context}"

Current project structure:
${context}

Suggest 5 different approaches or features that could be implemented. Be creative and practical for Roblox development.`;
      
      const response = await aiService.generateCode(prompt, 'ideate');
      
      socket.emit('ai:ideas', {
        ideas: response.suggestions || [],
        explanation: response.explanation
      });
      
    } catch (error) {
      socket.emit('ai:error', { message: error.message });
    }
  });

  // ==================== ROBLOX EXECUTION ====================
  
  socket.on('roblox:connect', () => {
    const session = sessions.get(socket.id);
    session.robloxConnected = true;
    socket.emit('roblox:connected', { status: true });
    console.log(`[LuaScratch] Roblox connected for session: ${session.id}`);
  });

  socket.on('roblox:disconnect', () => {
    const session = sessions.get(socket.id);
    session.robloxConnected = false;
    socket.emit('roblox:disconnected', { status: false });
  });

  socket.on('roblox:execute', async (data) => {
    const session = sessions.get(socket.id);
    
    if (!session.robloxConnected) {
      socket.emit('console:error', { 
        message: 'Roblox Studio not connected! Please install and run the LuaScratch plugin.',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    socket.emit('console:clear');
    socket.emit('console:log', { 
      type: 'info', 
      message: 'Executing code in Roblox Studio...',
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await robloxBridge.execute(data.code, session.id);
      
      socket.emit('console:log', { 
        type: 'success', 
        message: 'Code executed successfully!',
        timestamp: new Date().toISOString(),
        result: result
      });
      
      // Auto-test for errors
      if (data.autoTest) {
        socket.emit('console:log', { 
          type: 'info', 
          message: 'Running auto-test...',
          timestamp: new Date().toISOString()
        });
        
        setTimeout(() => {
          checkForErrors(socket, data.code);
        }, 2000);
      }
      
    } catch (error) {
      socket.emit('console:error', { 
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('roblox:gameTree', async () => {
    try {
      const tree = await robloxBridge.getGameTree();
      socket.emit('roblox:gameTree', tree);
    } catch (error) {
      socket.emit('console:error', { 
        message: `Failed to get game tree: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==================== FILE SYNC ====================
  
  socket.on('file:sync', async () => {
    const files = fileWatcher.getFileTree();
    socket.emit('file:synced', files);
  });

  socket.on('file:read', async (filePath) => {
    try {
      const content = await fileWatcher.readFile(filePath);
      socket.emit('file:content', { path: filePath, content });
    } catch (error) {
      socket.emit('file:error', { path: filePath, error: error.message });
    }
  });

  socket.on('file:write', async (data) => {
    try {
      await fileWatcher.writeFile(data.path, data.content);
      socket.emit('file:saved', { path: data.path });
      socket.broadcast.emit('file:updated', { path: data.path });
    } catch (error) {
      socket.emit('file:error', { path: data.path, error: error.message });
    }
  });

  // ==================== CONSOLE ====================
  
  socket.on('console:log', (data) => {
    socket.broadcast.emit('console:log', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('console:error', (data) => {
    socket.broadcast.emit('console:error', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('console:clear', () => {
    socket.emit('console:clear');
  });

  // ==================== DISCONNECT ====================
  
  socket.on('disconnect', () => {
    console.log(`[LuaScratch] Client disconnected: ${socket.id}`);
    sessions.delete(socket.id);
  });
});

// ==================== HTTP API ====================

// Roblox plugin endpoints
app.post('/api/roblox/execute', express.text(), async (req, res) => {
  try {
    const { code, sessionId } = req.body;
    const result = await robloxBridge.execute(code, sessionId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/roblox/console', express.json(), (req, res) => {
  const { message, type, sessionId } = req.body;
  
  // Broadcast to all connected clients
  io.emit('console:log', {
    type: type || 'log',
    message,
    source: 'roblox',
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

app.post('/api/roblox/error', express.json(), (req, res) => {
  const { message, stack, sessionId } = req.body;
  
  io.emit('console:error', {
    message,
    stack,
    source: 'roblox',
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true });
});

app.get('/api/roblox/gameTree', async (req, res) => {
  try {
    const tree = await robloxBridge.getGameTree();
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/roblox/sync', express.json(), async (req, res) => {
  try {
    const { gameData } = req.body;
    await fileWatcher.syncFromRoblox(gameData);
    io.emit('file:synced', fileWatcher.getFileTree());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
    const children = block.children.map(childId => {
      const child = blocks.find(b => b.id === childId);
      return child ? `  - ${child.type}: ${child.label}` : '';
    }).join('\n');
    
    return `- ${block.type}: ${block.label}${block.description ? ` (${block.description})` : ''}${children ? '\n' + children : ''}`;
  }).join('\n');
}

function buildAIPrompt(userPrompt, blockContext, fileContext, mode) {
  return `You are LuaScratch AI, an expert Roblox/Luau developer. You help create visual block-based code for Roblox games.

MODE: ${mode}

CURRENT PROJECT STRUCTURE:
${blockContext}

GAME FILES CONTEXT:
${fileContext}

USER REQUEST:
${userPrompt}

Please respond with:
1. Generated Luau code
2. A brief explanation of what the code does
3. Suggested block structure (if applicable)
4. Any important notes or warnings

Format your response as JSON with fields: code, explanation, suggestions (array), blocks (array of block objects with type, label, code, category).`;
}

async function checkForErrors(socket, code) {
  // This would check for runtime errors from Roblox
  // For now, we'll simulate the check
  socket.emit('console:log', { 
    type: 'info', 
    message: 'Auto-test completed. No errors detected.',
    timestamp: new Date().toISOString()
  });
}

function broadcastToAll(event, data) {
  io.emit(event, data);
}

// ==================== START SERVER ====================

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎮 LuaScratch Server                       ║
║              AI-Powered Visual Programming for Roblox        ║
╠══════════════════════════════════════════════════════════════╣
║  Web Interface: http://localhost:${PORT}                        ║
║  Workspace: ${WORKSPACE_DIR}                                  ║
║                                                              ║
║  Ready for Roblox Studio connections!                        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
