/**
 * LuaScratch v2.0 - Frontend Application
 * AI-Powered Visual Programming for Roblox
 */

// ==================== STATE ====================
const state = {
  socket: null,
  sessionId: null,
  currentProject: null,
  blocks: [],
  connections: [],
  selectedBlock: null,
  draggedBlock: null,
  isConnecting: false,
  connectionStart: null,
  zoom: 1,
  view: 'visual',
  robloxConnected: false,
  
  // Block categories with templates
  blockTemplates: {
    empty: [
      { type: 'empty', label: 'Empty Block', icon: 'fa-cube', description: 'Fully customizable block', color: '#6366f1' }
    ],
    events: [
      { type: 'event_start', label: '🎮 When Game Starts', icon: 'fa-play', isTemplate: true },
      { type: 'event_player_joined', label: '👤 Player Joined', icon: 'fa-user-plus', isTemplate: true },
      { type: 'event_clicked', label: '🖱️ When Clicked', icon: 'fa-mouse-pointer', isTemplate: true },
      { type: 'event_touched', label: '✋ When Touched', icon: 'fa-hand-point-up', isTemplate: true }
    ],
    control: [
      { type: 'control_wait', label: '⏱️ Wait', icon: 'fa-clock', isTemplate: true },
      { type: 'control_repeat', label: '🔁 Repeat', icon: 'fa-redo', isTemplate: true },
      { type: 'control_if', label: '❓ If', icon: 'fa-code-branch', isTemplate: true }
    ],
    motion: [
      { type: 'motion_move', label: '➡️ Move', icon: 'fa-arrows-alt', isTemplate: true },
      { type: 'motion_rotate', label: '🔄 Rotate', icon: 'fa-sync-alt', isTemplate: true },
      { type: 'motion_teleport', label: '⚡ Teleport', icon: 'fa-bolt', isTemplate: true }
    ],
    roblox: [
      { type: 'rbx_print', label: '📢 Print', icon: 'fa-terminal', isTemplate: true },
      { type: 'rbx_instance', label: '📦 Create Instance', icon: 'fa-plus-square', isTemplate: true },
      { type: 'rbx_tween', label: '🎬 Tween', icon: 'fa-film', isTemplate: true },
      { type: 'rbx_event', label: '🔔 Fire Event', icon: 'fa-broadcast-tower', isTemplate: true }
    ]
  }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  showLoadingScreen();
  await simulateLoading();
  initSocket();
  setupEventListeners();
  initBlockPalette();
  hideLoadingScreen();
}

function showLoadingScreen() {
  document.getElementById('loading-screen').classList.remove('hidden');
}

function hideLoadingScreen() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function simulateLoading() {
  const statuses = ['Connecting to AI...', 'Loading blocks...', 'Ready!'];
  for (const status of statuses) {
    document.querySelector('.loading-status').textContent = status;
    await new Promise(r => setTimeout(r, 400));
  }
}

// ==================== SOCKET.IO ====================
function initSocket() {
  state.socket = io({ transports: ['websocket', 'polling'] });
  
  state.socket.on('connect', () => {
    console.log('[LuaScratch] Connected');
    logConsole('Connected to server', 'success');
  });
  
  state.socket.on('disconnect', () => {
    logConsole('Disconnected from server', 'error');
  });
  
  state.socket.on('workspace:init', (data) => {
    state.sessionId = data.sessionId;
  });
  
  state.socket.on('project:created', (project) => {
    state.currentProject = project;
    updateProjectDisplay();
    showToast(`Project "${project.name}" created!`, 'success');
  });
  
  state.socket.on('project:loaded', (project) => {
    state.currentProject = project;
    state.blocks = project.blocks || [];
    state.connections = project.connections || [];
    renderAllBlocks();
    drawConnections();
    updateProjectDisplay();
  });
  
  state.socket.on('project:list', (projects) => {
    updateProjectsList(projects);
  });
  
  state.socket.on('block:added', (data) => {
    if (data.block) {
      if (!state.blocks.find(b => b.id === data.block.id)) {
        state.blocks.push(data.block);
        renderBlock(data.block);
        updateGeneratedCode();
      }
    }
  });
  
  state.socket.on('block:updated', (data) => {
    if (data.block) {
      const idx = state.blocks.findIndex(b => b.id === data.block.id);
      if (idx > -1) {
        state.blocks[idx] = data.block;
        updateBlockElement(data.block);
        updateGeneratedCode();
      }
    }
  });
  
  state.socket.on('block:deleted', (data) => {
    const blockId = typeof data === 'string' ? data : data.blockId;
    removeBlockElement(blockId);
    state.blocks = state.blocks.filter(b => b.id !== blockId);
    state.connections = state.connections.filter(c => c.from !== blockId && c.to !== blockId);
    drawConnections();
    updateGeneratedCode();
  });
  
  state.socket.on('block:connected', (data) => {
    if (!state.connections.find(c => c.from === data.from && c.to === data.to)) {
      state.connections.push({ from: data.from, to: data.to });
      drawConnections();
    }
  });
  
  state.socket.on('ai:loading', (data) => {
    showAILoading(data.message, data.stage);
  });
  
  state.socket.on('ai:response', (data) => {
    hideAILoading();
    showAIResponse(data);
  });
  
  state.socket.on('ai:fixed', (data) => {
    hideAILoading();
    showToast('Code fixed!', 'success');
    document.getElementById('ai-generated-code').textContent = data.code;
    openModal('ai-response-modal');
  });
  
  state.socket.on('ai:error', (error) => {
    hideAILoading();
    showToast(`AI Error: ${error.message}`, 'error');
  });
  
  state.socket.on('console:log', (data) => {
    logConsole(data.message, data.type, data.source);
  });
  
  state.socket.on('console:error', (data) => {
    logConsole(data.message, 'error', data.source);
  });
  
  state.socket.on('roblox:connected', () => {
    state.robloxConnected = true;
    updateRobloxStatus();
    showToast('Roblox Studio connected!', 'success');
  });
  
  state.socket.on('roblox:disconnected', () => {
    state.robloxConnected = false;
    updateRobloxStatus();
  });
  
  state.socket.on('roblox:gameTree', (tree) => {
    console.log('[Game Tree]', tree);
  });
}

// ==================== BLOCK PALETTE ====================
function initBlockPalette() {
  renderPalette('empty');
}

function renderPalette(category) {
  const palette = document.getElementById('block-palette');
  palette.innerHTML = '';
  
  const templates = state.blockTemplates[category] || [];
  
  templates.forEach(template => {
    const div = document.createElement('div');
    div.className = 'palette-block';
    div.style.background = template.color || getCategoryColor(category);
    div.draggable = true;
    div.dataset.type = template.type;
    div.dataset.category = category;
    div.innerHTML = `<i class="fas ${template.icon}"></i><span>${template.label}</span>`;
    
    if (template.isTemplate) {
      div.classList.add('template');
      div.title = 'Click to use as template';
    }
    
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify({
        ...template,
        category,
        isNew: true
      }));
    });
    
    div.addEventListener('dblclick', () => {
      addBlockFromTemplate(template, category);
    });
    
    palette.appendChild(div);
  });
}

function getCategoryColor(category) {
  const colors = {
    empty: '#6366f1',
    events: '#FFD700',
    control: '#FF8C00',
    motion: '#4169E1',
    logic: '#32CD32',
    variables: '#FF6347',
    functions: '#9370DB',
    roblox: '#00CED1'
  };
  return colors[category] || '#6366f1';
}

function addBlockFromTemplate(template, category) {
  const position = getCenterPosition();
  
  const block = {
    id: generateId(),
    type: template.type,
    category: category,
    label: template.label.replace(/[🎮👤🖱️✋⏱️🔁❓➡️🔄⚡📢📦🎬🔔]/g, '').trim(),
    icon: template.icon,
    code: getTemplateCode(template.type),
    description: template.description || '',
    color: template.color || getCategoryColor(category),
    position: position,
    inputs: [],
    outputs: [],
    children: [],
    parentId: null
  };
  
  // If it's an empty block, open editor immediately
  if (template.type === 'empty') {
    block.label = 'New Block';
    block.code = '-- Your code here';
  }
  
  state.blocks.push(block);
  renderBlock(block);
  updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('block:add', block);
  }
  
  // Select and edit if empty
  if (template.type === 'empty') {
    setTimeout(() => selectBlock(block), 100);
  }
}

function getTemplateCode(type) {
  const codes = {
    empty: '-- Your code here',
    event_start: '-- Game start code',
    event_player_joined: 'game.Players.PlayerAdded:Connect(function(player)\n  -- Player joined code\nend)',
    event_clicked: 'script.Parent.ClickDetector.MouseClick:Connect(function(player)\n  -- Click code\nend)',
    event_touched: 'script.Parent.Touched:Connect(function(hit)\n  -- Touch code\nend)',
    control_wait: 'wait(1)',
    control_repeat: 'for i = 1, 10 do\n  -- Loop code\nend',
    control_if: 'if condition then\n  -- If code\nend',
    motion_move: 'script.Parent.Position = script.Parent.Position + Vector3.new(0, 0, 5)',
    motion_rotate: 'script.Parent.CFrame = script.Parent.CFrame * CFrame.Angles(0, math.rad(90), 0)',
    motion_teleport: 'script.Parent.Position = Vector3.new(0, 10, 0)',
    rbx_print: 'print("Hello from LuaScratch!")',
    rbx_instance: 'local part = Instance.new("Part")\npart.Parent = workspace',
    rbx_tween: 'local tween = game:GetService("TweenService"):Create(object, TweenInfo.new(1), {Position = targetPos})\ntween:Play()',
    rbx_event: 'remoteEvent:FireClient(player, data)'
  };
  return codes[type] || '-- Code here';
}

function getCenterPosition() {
  const container = document.getElementById('blocks-container');
  const rect = container.getBoundingClientRect();
  return {
    x: (rect.width / 2 - 100) / state.zoom,
    y: (rect.height / 2 - 50) / state.zoom
  };
}

// ==================== WORKSPACE ====================
function setupEventListeners() {
  // Category tabs
  document.querySelectorAll('.category').forEach(cat => {
    cat.addEventListener('click', () => {
      document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
      cat.classList.add('active');
      renderPalette(cat.dataset.category);
    });
  });
  
  // Workspace tabs
  document.querySelectorAll('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchView(tab.dataset.view);
    });
  });
  
  // Sidebar tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.panel;
      document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${panel}-panel`).classList.add('active');
    });
  });
  
  // Toolbar buttons
  document.getElementById('run-btn').addEventListener('click', executeCode);
  document.getElementById('ai-assist-btn').addEventListener('click', () => {
    document.querySelector('[data-panel="ai-chat"]').click();
  });
  document.getElementById('zoom-in').addEventListener('click', () => zoom(0.1));
  document.getElementById('zoom-out').addEventListener('click', () => zoom(-0.1));
  document.getElementById('fit-view').addEventListener('click', () => { state.zoom = 1; applyZoom(); });
  document.getElementById('delete-block').addEventListener('click', deleteSelected);
  document.getElementById('clear-workspace').addEventListener('click', clearWorkspace);
  document.getElementById('clear-console').addEventListener('click', clearConsole);
  document.getElementById('copy-code').addEventListener('click', copyCode);
  
  // Property panel
  document.getElementById('update-block').addEventListener('click', updateBlockFromProperties);
  document.getElementById('delete-selected').addEventListener('click', deleteSelected);
  
  // AI Chat
  document.getElementById('send-ai-prompt').addEventListener('click', sendAIPrompt);
  document.getElementById('ai-ideate').addEventListener('click', requestIdeas);
  document.getElementById('ai-prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIPrompt();
    }
  });
  
  // Modals
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  document.getElementById('create-project').addEventListener('click', createProject);
  document.getElementById('new-project-btn').addEventListener('click', () => {
    closeAllModals();
    openModal('new-project-modal');
  });
  
  // AI Response Modal
  document.getElementById('apply-ai-code').addEventListener('click', applyAICode);
  document.getElementById('execute-ai-code').addEventListener('click', executeAICode);
  
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ai-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`ai-${tab.dataset.aiTab}-panel`).classList.add('active');
    });
  });
  
  // Console filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterConsole(btn.dataset.filter);
    });
  });
  
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'projects') {
        state.socket.emit('project:list');
        openModal('projects-modal');
      }
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && state.selectedBlock) {
      deleteSelected();
    }
    if (e.key === 'Escape') {
      deselectBlock();
      closeAllModals();
      cancelConnection();
    }
  });
  
  // Workspace drop
  setupWorkspaceDrop();
}

function setupWorkspaceDrop() {
  const workspace = document.getElementById('block-workspace');
  const container = document.getElementById('blocks-container');
  
  workspace.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  
  workspace.addEventListener('drop', (e) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    const template = JSON.parse(data);
    const rect = container.getBoundingClientRect();
    
    const position = {
      x: (e.clientX - rect.left) / state.zoom,
      y: (e.clientY - rect.top) / state.zoom
    };
    
    if (template.isNew) {
      // New block from palette
      const block = {
        id: generateId(),
        type: template.type,
        category: template.category,
        label: template.label.replace(/[🎮👤🖱️✋⏱️🔁❓➡️🔄⚡📢📦🎬🔔]/g, '').trim(),
        icon: template.icon,
        code: getTemplateCode(template.type),
        description: '',
        color: template.color || getCategoryColor(template.category),
        position: position,
        inputs: [],
        outputs: [],
        children: [],
        parentId: null
      };
      
      if (template.type === 'empty') {
        block.label = 'New Block';
      }
      
      state.blocks.push(block);
      renderBlock(block);
      updateGeneratedCode();
      
      if (state.socket) {
        state.socket.emit('block:add', block);
      }
      
      if (template.type === 'empty') {
        setTimeout(() => selectBlock(block), 100);
      }
    }
  });
  
  // Click empty space to deselect
  workspace.addEventListener('click', (e) => {
    if (e.target === workspace || e.target === container || e.target.id === 'connections-layer') {
      deselectBlock();
      cancelConnection();
    }
  });
}

// ==================== BLOCK RENDERING ====================
function renderAllBlocks() {
  const container = document.getElementById('blocks-container');
  // Keep placeholder if no blocks
  if (state.blocks.length === 0) {
    container.innerHTML = `
      <div class="workspace-placeholder">
        <i class="fas fa-hand-pointer"></i>
        <p>Drag blocks here or double-click a template</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '<svg class="connections-layer" id="connections-layer"></svg>';
  state.blocks.forEach(block => renderBlock(block));
}

function renderBlock(block) {
  const container = document.getElementById('blocks-container');
  
  // Remove placeholder if exists
  const placeholder = container.querySelector('.workspace-placeholder');
  if (placeholder) placeholder.remove();
  
  // Check if already rendered
  let el = document.getElementById(`block-${block.id}`);
  if (el) el.remove();
  
  el = document.createElement('div');
  el.id = `block-${block.id}`;
  el.className = 'workspace-block';
  el.style.left = `${block.position.x}px`;
  el.style.top = `${block.position.y}px`;
  el.style.background = block.color || getCategoryColor(block.category);
  
  el.innerHTML = `
    <div class="block-connector input" data-block="${block.id}" data-type="input"></div>
    <div class="block-header">
      <span class="block-title"><i class="fas ${block.icon || 'fa-cube'}"></i> ${escapeHtml(block.label)}</span>
      <div class="block-actions">
        <button class="block-action-btn connect-btn" title="Connect"><i class="fas fa-link"></i></button>
        <button class="block-action-btn edit-btn" title="Edit"><i class="fas fa-pen"></i></button>
        <button class="block-action-btn delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <div class="block-content">${escapeHtml(block.description || '')}</div>
    <div class="block-connector output" data-block="${block.id}" data-type="output"></div>
  `;
  
  // Make draggable
  makeDraggable(el, block);
  
  // Click to select
  el.addEventListener('click', (e) => {
    if (e.target.closest('.block-action-btn') || e.target.closest('.block-connector')) return;
    selectBlock(block);
  });
  
  // Action buttons
  el.querySelector('.edit-btn').addEventListener('click', () => selectBlock(block));
  el.querySelector('.delete-btn').addEventListener('click', () => deleteBlock(block.id));
  el.querySelector('.connect-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    startConnection(block.id, 'output');
  });
  
  // Connector interactions
  const inputConnector = el.querySelector('.block-connector.input');
  const outputConnector = el.querySelector('.block-connector.output');
  
  inputConnector.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.isConnecting && state.connectionStart) {
      completeConnection(block.id, 'input');
    }
  });
  
  outputConnector.addEventListener('click', (e) => {
    e.stopPropagation();
    startConnection(block.id, 'output');
  });
  
  container.appendChild(el);
}

function updateBlockElement(block) {
  const el = document.getElementById(`block-${block.id}`);
  if (!el) return;
  
  el.style.left = `${block.position.x}px`;
  el.style.top = `${block.position.y}px`;
  el.style.background = block.color || getCategoryColor(block.category);
  
  el.querySelector('.block-title').innerHTML = `<i class="fas ${block.icon || 'fa-cube'}"></i> ${escapeHtml(block.label)}`;
  el.querySelector('.block-content').textContent = block.description || '';
}

function removeBlockElement(blockId) {
  const el = document.getElementById(`block-${blockId}`);
  if (el) el.remove();
  
  if (state.blocks.length === 0) {
    const container = document.getElementById('blocks-container');
    container.innerHTML = `
      <div class="workspace-placeholder">
        <i class="fas fa-hand-pointer"></i>
        <p>Drag blocks here or double-click a template</p>
      </div>
    `;
  }
}

function makeDraggable(el, block) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('.block-action-btn') || e.target.closest('.block-connector')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = block.position.x;
    startTop = block.position.y;
    el.classList.add('dragging');
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  
  function onMove(e) {
    if (!isDragging) return;
    
    const dx = (e.clientX - startX) / state.zoom;
    const dy = (e.clientY - startY) / state.zoom;
    
    block.position.x = startLeft + dx;
    block.position.y = startTop + dy;
    
    el.style.left = `${block.position.x}px`;
    el.style.top = `${block.position.y}px`;
    
    drawConnections();
  }
  
  function onUp() {
    isDragging = false;
    el.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    
    if (state.socket) {
      state.socket.emit('block:update', {
        id: block.id,
        updates: { position: block.position }
      });
    }
  }
}

// ==================== CONNECTIONS ====================
function startConnection(blockId, connectorType) {
  if (state.isConnecting) {
    cancelConnection();
    return;
  }
  
  state.isConnecting = true;
  state.connectionStart = { blockId, type: connectorType };
  
  const el = document.getElementById(`block-${blockId}`);
  const connector = el.querySelector(`.block-connector.${connectorType}`);
  connector.classList.add('active');
  
  showToast('Click another block to connect', 'info');
}

function completeConnection(targetBlockId, targetType) {
  if (!state.isConnecting || !state.connectionStart) return;
  
  const from = state.connectionStart.blockId;
  const to = targetBlockId;
  
  if (from === to) {
    cancelConnection();
    return;
  }
  
  // Add connection
  if (!state.connections.find(c => c.from === from && c.to === to)) {
    state.connections.push({ from, to });
    
    // Update block relationships
    const fromBlock = state.blocks.find(b => b.id === from);
    const toBlock = state.blocks.find(b => b.id === to);
    
    if (fromBlock && toBlock) {
      toBlock.parentId = from;
      if (!fromBlock.children.includes(to)) {
        fromBlock.children.push(to);
      }
    }
    
    if (state.socket) {
      state.socket.emit('block:connect', { from, to });
    }
    
    drawConnections();
    showToast('Blocks connected!', 'success');
  }
  
  cancelConnection();
}

function cancelConnection() {
  state.isConnecting = false;
  state.connectionStart = null;
  
  document.querySelectorAll('.block-connector.active').forEach(c => {
    c.classList.remove('active');
  });
}

function drawConnections() {
  const svg = document.getElementById('connections-layer');
  if (!svg) return;
  
  svg.innerHTML = '';
  
  state.connections.forEach(conn => {
    const fromEl = document.getElementById(`block-${conn.from}`);
    const toEl = document.getElementById(`block-${conn.to}`);
    
    if (!fromEl || !toEl) return;
    
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const containerRect = document.getElementById('blocks-container').getBoundingClientRect();
    
    const x1 = (fromRect.left + fromRect.width / 2 - containerRect.left) / state.zoom;
    const y1 = (fromRect.bottom - containerRect.top) / state.zoom;
    const x2 = (toRect.left + toRect.width / 2 - containerRect.left) / state.zoom;
    const y2 = (toRect.top - containerRect.top) / state.zoom;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + 50}, ${x2} ${y2 - 50}, ${x2} ${y2}`);
    path.setAttribute('class', 'connection-line');
    svg.appendChild(path);
  });
}

// ==================== BLOCK SELECTION & EDITING ====================
function selectBlock(block) {
  deselectBlock();
  
  state.selectedBlock = block;
  
  const el = document.getElementById(`block-${block.id}`);
  if (el) el.classList.add('selected');
  
  showBlockProperties(block);
}

function deselectBlock() {
  if (state.selectedBlock) {
    const el = document.getElementById(`block-${state.selectedBlock.id}`);
    if (el) el.classList.remove('selected');
  }
  state.selectedBlock = null;
  hideBlockProperties();
}

function showBlockProperties(block) {
  document.getElementById('no-selection').classList.add('hidden');
  document.getElementById('block-properties').classList.remove('hidden');
  
  document.getElementById('prop-type').value = block.type;
  document.getElementById('prop-label').value = block.label || '';
  document.getElementById('prop-description').value = block.description || '';
  document.getElementById('prop-code').value = block.code || '';
  document.getElementById('prop-color').value = block.color || getCategoryColor(block.category);
  document.getElementById('prop-icon').value = block.icon || 'fa-cube';
}

function hideBlockProperties() {
  document.getElementById('no-selection').classList.remove('hidden');
  document.getElementById('block-properties').classList.add('hidden');
}

function updateBlockFromProperties() {
  if (!state.selectedBlock) return;
  
  const updates = {
    label: document.getElementById('prop-label').value,
    description: document.getElementById('prop-description').value,
    code: document.getElementById('prop-code').value,
    color: document.getElementById('prop-color').value,
    icon: document.getElementById('prop-icon').value
  };
  
  Object.assign(state.selectedBlock, updates);
  updateBlockElement(state.selectedBlock);
  updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('block:update', {
      id: state.selectedBlock.id,
      updates
    });
  }
  
  showToast('Block updated!', 'success');
}

function deleteBlock(blockId) {
  if (!confirm('Delete this block?')) return;
  
  const block = state.blocks.find(b => b.id === blockId);
  if (!block) return;
  
  if (state.selectedBlock?.id === blockId) {
    deselectBlock();
  }
  
  state.blocks = state.blocks.filter(b => b.id !== blockId);
  state.connections = state.connections.filter(c => c.from !== blockId && c.to !== blockId);
  
  removeBlockElement(blockId);
  drawConnections();
  updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('block:delete', blockId);
  }
}

function deleteSelected() {
  if (state.selectedBlock) {
    deleteBlock(state.selectedBlock.id);
  }
}

function clearWorkspace() {
  if (!confirm('Clear all blocks?')) return;
  
  state.blocks.forEach(block => {
    if (state.socket) state.socket.emit('block:delete', block.id);
  });
  
  state.blocks = [];
  state.connections = [];
  state.selectedBlock = null;
  
  renderAllBlocks();
  hideBlockProperties();
  updateGeneratedCode();
  
  showToast('Workspace cleared', 'info');
}

// ==================== CODE GENERATION ====================
function updateGeneratedCode() {
  let code = '-- Generated by LuaScratch\n';
  code += `-- Project: ${state.currentProject?.name || 'Untitled'}\n`;
  code += `-- Time: ${new Date().toLocaleString()}\n\n`;
  
  if (state.blocks.length === 0) {
    code += '-- Add blocks to generate code\n';
  } else {
    // Sort by connections
    const sorted = sortBlocks();
    sorted.forEach(block => {
      code += `-- ${block.label}\n`;
      code += `${block.code || '-- No code'}\n\n`;
    });
  }
  
  document.getElementById('code-editor').textContent = code;
  return code;
}

function sortBlocks() {
  const result = [];
  const visited = new Set();
  
  // Blocks with no parents first
  const rootBlocks = state.blocks.filter(b => !b.parentId);
  
  function addBlockAndChildren(block) {
    if (visited.has(block.id)) return;
    visited.add(block.id);
    result.push(block);
    
    if (block.children) {
      block.children.forEach(childId => {
        const child = state.blocks.find(b => b.id === childId);
        if (child) addBlockAndChildren(child);
      });
    }
  }
  
  rootBlocks.forEach(addBlockAndChildren);
  
  // Add any remaining
  state.blocks.forEach(b => {
    if (!visited.has(b.id)) result.push(b);
  });
  
  return result;
}

// ==================== EXECUTION ====================
function executeCode() {
  if (!state.robloxConnected) {
    showToast('Roblox Studio not connected!', 'error');
    return;
  }
  
  const code = updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('roblox:execute', { code });
  }
  
  logConsole('Sending code to Roblox Studio...', 'info');
}

// ==================== AI INTEGRATION ====================
function showAILoading(message, stage) {
  const overlay = document.getElementById('ai-loading-overlay');
  document.getElementById('ai-loading-message').textContent = message;
  overlay.classList.remove('hidden');
  
  document.querySelectorAll('.stage').forEach(s => {
    s.classList.toggle('active', s.dataset.stage === stage);
  });
}

function hideAILoading() {
  document.getElementById('ai-loading-overlay').classList.add('hidden');
}

function sendAIPrompt() {
  const input = document.getElementById('ai-prompt');
  const prompt = input.value.trim();
  
  if (!prompt) return;
  
  addChatMessage('user', prompt);
  input.value = '';
  
  if (state.socket) {
    state.socket.emit('ai:generate', { prompt, mode: 'generate' });
  }
}

function requestIdeas() {
  const context = state.currentProject?.name || 'My Roblox game';
  
  if (state.socket) {
    state.socket.emit('ai:ideate', { context });
  }
}

function addChatMessage(sender, text) {
  const container = document.getElementById('ai-chat-messages');
  const div = document.createElement('div');
  div.className = sender === 'user' ? 'user-message' : 'ai-message';
  div.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showAIResponse(data) {
  document.getElementById('ai-generated-code').textContent = data.code;
  document.getElementById('ai-explanation-text').innerHTML = escapeHtml(data.explanation);
  
  addChatMessage('ai', data.explanation || 'Code generated!');
  
  openModal('ai-response-modal');
}

function applyAICode() {
  const code = document.getElementById('ai-generated-code').textContent;
  
  const block = {
    id: generateId(),
    type: 'ai_generated',
    category: 'roblox',
    label: 'AI Generated',
    icon: 'fa-robot',
    code: code,
    description: 'Generated by AI',
    color: '#ec4899',
    position: getCenterPosition(),
    inputs: [],
    outputs: [],
    children: [],
    parentId: null
  };
  
  state.blocks.push(block);
  renderBlock(block);
  updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('block:add', block);
  }
  
  closeAllModals();
  showToast('AI code applied!', 'success');
}

function executeAICode() {
  if (!state.robloxConnected) {
    showToast('Roblox not connected!', 'error');
    return;
  }
  
  const code = document.getElementById('ai-generated-code').textContent;
  
  if (state.socket) {
    state.socket.emit('roblox:execute', { code });
  }
  
  closeAllModals();
}

// ==================== PROJECTS ====================
function createProject() {
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();
  
  if (!name) {
    showToast('Enter a project name', 'warning');
    return;
  }
  
  if (state.socket) {
    state.socket.emit('project:create', { name, description });
  }
  
  closeAllModals();
  document.getElementById('project-name').value = '';
  document.getElementById('project-description').value = '';
}

function updateProjectDisplay() {
  const el = document.getElementById('current-project-name');
  el.textContent = state.currentProject?.name || 'No Project';
}

function updateProjectsList(projects) {
  const grid = document.getElementById('projects-grid');
  
  if (projects.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><p>No projects yet</p></div>';
    return;
  }
  
  grid.innerHTML = projects.map(p => `
    <div class="project-card" onclick="loadProject('${p.id}')">
      <h4>${escapeHtml(p.name)}</h4>
      <p>${escapeHtml(p.description || 'No description')}</p>
      <small>${new Date(p.createdAt).toLocaleDateString()}</small>
    </div>
  `).join('');
}

function loadProject(id) {
  if (state.socket) {
    state.socket.emit('project:load', id);
  }
  closeAllModals();
}

// ==================== CONSOLE ====================
function logConsole(message, type = 'log', source = 'system') {
  const output = document.getElementById('console-output');
  
  const entry = document.createElement('div');
  entry.className = `console-message ${type}`;
  entry.innerHTML = `
    <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
    <span class="message">${source !== 'system' ? `[${source}] ` : ''}${escapeHtml(message)}</span>
  `;
  
  output.appendChild(entry);
  output.scrollTop = output.scrollHeight;
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '';
}

function filterConsole(filter) {
  document.querySelectorAll('.console-message').forEach(msg => {
    msg.style.display = filter === 'all' || msg.classList.contains(filter) ? 'flex' : 'none';
  });
}

// ==================== UI HELPERS ====================
function switchView(view) {
  state.view = view;
  const blockWorkspace = document.querySelector('.block-workspace');
  const codePanel = document.getElementById('code-panel');
  
  if (view === 'visual') {
    blockWorkspace.style.display = 'block';
    codePanel.classList.add('hidden');
    blockWorkspace.style.width = '100%';
  } else if (view === 'code') {
    blockWorkspace.style.display = 'none';
    codePanel.classList.remove('hidden');
    codePanel.style.width = '100%';
  } else if (view === 'split') {
    blockWorkspace.style.display = 'block';
    blockWorkspace.style.width = '50%';
    codePanel.classList.remove('hidden');
    codePanel.style.width = '50%';
  }
  
  updateGeneratedCode();
}

function zoom(delta) {
  state.zoom = Math.max(0.5, Math.min(2, state.zoom + delta));
  applyZoom();
}

function applyZoom() {
  document.getElementById('blocks-container').style.transform = `scale(${state.zoom})`;
}

function copyCode() {
  const code = document.getElementById('code-editor').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Code copied!', 'success');
  });
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation', info: 'fa-info' };
  toast.innerHTML = `
    <i class="fas ${icons[type]}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateRobloxStatus() {
  const dot = document.querySelector('#roblox-status .status-dot');
  const text = document.querySelector('#roblox-status .status-text');
  
  if (state.robloxConnected) {
    dot.className = 'status-dot connected';
    text.textContent = 'Roblox: Connected';
  } else {
    dot.className = 'status-dot disconnected';
    text.textContent = 'Roblox: Disconnected';
  }
}

function generateId() {
  return 'blk_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose for onclick handlers
window.loadProject = loadProject;
