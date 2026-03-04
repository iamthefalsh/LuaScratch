const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

class AIService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN || "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";
    this.endpoint = "https://models.github.ai/inference";
    this.model = "openai/gpt-5";
    
    this.client = ModelClient(
      this.endpoint,
      new AzureKeyCredential(this.token)
    );

    this.systemPrompt = `You are LuaScratch AI, an expert Roblox/Luau developer specializing in visual block-based programming.

Your expertise includes:
- Roblox API and Services (Players, Workspace, ReplicatedStorage, etc.)
- Luau scripting best practices
- Event-driven programming
- Client-Server communication (RemoteEvents, RemoteFunctions)
- UI design with Roblox UI components
- Physics, animations, and game mechanics
- Performance optimization

When generating code:
1. Write clean, well-commented Luau code
2. Follow Roblox security best practices
3. Use appropriate Roblox services
4. Include error handling where relevant
5. Make code modular and reusable

When suggesting blocks:
- Each block should represent a logical unit of functionality
- Blocks should be connectable (parent-child relationships)
- Include input/output parameters
- Provide clear labels and descriptions`;

    console.log('[AI Service] Initialized with model:', this.model);
  }

  async generateCode(prompt, mode = 'generate') {
    const startTime = Date.now();
    
    try {
      console.log(`[AI Service] Generating code in ${mode} mode...`);
      
      const messages = [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ];

      const response = await this.client.path("/chat/completions").post({
        body: {
          messages: messages,
          model: this.model,
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.95
        }
      });

      if (isUnexpected(response)) {
        throw new Error(response.body.error?.message || 'Unknown API error');
      }

      const content = response.body.choices[0].message.content;
      const duration = Date.now() - startTime;
      
      console.log(`[AI Service] Response received in ${duration}ms`);
      
      // Parse the response
      return this.parseResponse(content, mode);
      
    } catch (error) {
      console.error('[AI Service] Error:', error.message);
      throw error;
    }
  }

  parseResponse(content, mode) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/\{[\s\S]*"code"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        return {
          code: parsed.code || '',
          explanation: parsed.explanation || '',
          suggestions: parsed.suggestions || [],
          blocks: parsed.blocks || []
        };
      }
      
      // Fallback: extract code blocks
      const codeMatch = content.match(/```lua\n([\s\S]*?)\n```/) ||
                       content.match(/```luau\n([\s\S]*?)\n```/) ||
                       content.match(/```\n([\s\S]*?)\n```/);
      
      return {
        code: codeMatch ? codeMatch[1].trim() : content,
        explanation: this.extractExplanation(content),
        suggestions: this.extractSuggestions(content),
        blocks: []
      };
      
    } catch (error) {
      console.log('[AI Service] Parse fallback, returning raw content');
      return {
        code: content,
        explanation: 'Code generated successfully.',
        suggestions: [],
        blocks: []
      };
    }
  }

  extractExplanation(content) {
    const explanationMatch = content.match(/(?:explanation|what it does|description):?\s*\n?([\s\S]*?)(?=\n\n|$)/i);
    return explanationMatch ? explanationMatch[1].trim() : '';
  }

  extractSuggestions(content) {
    const suggestions = [];
    const suggestionMatch = content.match(/suggestions?:?\s*\n?([\s\S]*?)(?=\n\n|$)/i);
    
    if (suggestionMatch) {
      const lines = suggestionMatch[1].split('\n');
      lines.forEach(line => {
        const clean = line.replace(/^[-*\d.\s]+/, '').trim();
        if (clean) suggestions.push(clean);
      });
    }
    
    return suggestions;
  }

  async generateBlocksFromCode(code, description) {
    const prompt = `Convert this Luau code into visual programming blocks:

CODE:
${code}

DESCRIPTION:
${description}

Please provide an array of block objects with:
- type: the block type (event, action, condition, loop, variable, etc.)
- label: display name
- code: the specific code for this block
- category: category name (movement, logic, events, etc.)
- inputs: array of input parameters
- outputs: array of output values

Format as JSON.`;

    const response = await this.generateCode(prompt, 'blocks');
    return response.blocks || [];
  }

  async explainCode(code) {
    const prompt = `Explain this Luau code in simple terms:

${code}

Provide a brief explanation suitable for a beginner Roblox developer.`;

    const response = await this.generateCode(prompt, 'explain');
    return response.explanation;
  }

  async optimizeCode(code) {
    const prompt = `Optimize this Luau code for better performance:

${code}

Provide the optimized code and explain what improvements were made.`;

    return await this.generateCode(prompt, 'optimize');
  }

  async generateFromBlocks(blocks) {
    const blockDescription = blocks.map(b => 
      `${b.type}: ${b.label}${b.code ? ` -> ${b.code}` : ''}`
    ).join('\n');

    const prompt = `Generate complete Luau code from these visual blocks:

BLOCKS:
${blockDescription}

Please provide the complete, runnable Luau script that implements all these blocks in order.`;

    return await this.generateCode(prompt, 'compile');
  }
}

module.exports = AIService;
