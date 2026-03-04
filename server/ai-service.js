const axios = require('axios');

/**
 * AI Service using GitHub Models API with DeepSeek
 */
class AIService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN || "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";
    this.endpoint = "https://models.github.ai/inference/chat/completions";
    this.model = "deepseek/DeepSeek-V3-0324";
    
    this.systemPrompt = `You are LuaScratch AI, an expert Roblox/Luau developer.

RULES:
1. Write CLEAN, COMMENTED Luau code
2. Use Roblox best practices
3. Include ERROR HANDLING with pcall when needed
4. Make code MODULAR and REUSABLE
5. Use proper VARIABLE NAMES

When generating code:
- Provide COMPLETE, RUNNABLE code
- Include brief EXPLANATION  
- Suggest BLOCK STRUCTURE if applicable
- WARN about common pitfalls

BLOCK TYPES:
- empty: Fully customizable block
- event_start, event_player_joined, event_touched, event_clicked
- control_wait, control_repeat, control_if
- motion_move, motion_teleport, motion_rotate
- rbx_print, rbx_instance_new, rbx_tween, rbx_fire_event

RESPOND WITH JSON:
{
  "code": "luau code here",
  "explanation": "what the code does",
  "suggestions": ["improvement 1", "improvement 2"],
  "blocks": [{"type": "...", "label": "...", "category": "...", "code": "...", "description": "..."}]
}`;

    console.log('[AI Service] Initialized with model:', this.model);
  }

  async generateCode(prompt, mode = 'generate') {
    const startTime = Date.now();
    
    try {
      console.log(`[AI Service] Generating with DeepSeek...`);
      
      const messages = [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: prompt }
      ];

      const response = await axios.post(
        this.endpoint,
        {
          messages: messages,
          model: this.model,
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.95
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      const duration = Date.now() - startTime;
      
      console.log(`[AI Service] Response in ${duration}ms`);
      
      return this.parseResponse(content);
      
    } catch (error) {
      console.error('[AI Service] Error:', error.message);
      if (error.response) {
        console.error('[AI Service] Status:', error.response.status);
        console.error('[AI Service] Data:', error.response.data);
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  parseResponse(content) {
    try {
      // Try to extract JSON
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
        explanation: 'Code generated successfully.',
        suggestions: [],
        blocks: []
      };
      
    } catch (error) {
      console.log('[AI Service] Parse fallback');
      return {
        code: content,
        explanation: 'Code generated.',
        suggestions: [],
        blocks: []
      };
    }
  }

  async fixCode(code, error) {
    const prompt = `Fix this Luau code that has an error:

CODE:
${code}

ERROR:
${error}

Provide the fixed code and brief explanation of what was wrong.`;

    return await this.generateCode(prompt, 'fix');
  }

  async generateIdeas(context) {
    const prompt = `Given this Roblox game context: "${context}"

Suggest 5 creative features or improvements. Be practical and specific.`;

    const response = await this.generateCode(prompt, 'ideate');
    return response.suggestions || [];
  }
}

module.exports = AIService;
