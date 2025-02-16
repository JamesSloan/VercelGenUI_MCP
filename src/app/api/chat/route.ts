import OpenAI from 'openai';
import { MCPServer } from '../../../lib/mcp/server';
import { weatherTool } from '../../../lib/mcp/tools/weather';
import { searchTool } from '../../../lib/mcp/tools/search';
import { systemTool } from '../../../lib/mcp/tools/system';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize MCP Server
const mcpServer = new MCPServer({ debug: true });
mcpServer.use(async (context, next) => {
  context.state.set('tools', [weatherTool, searchTool, systemTool]);
  await next();
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// Handle POST request for chat
export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant with access to various tools. You can use these tools to provide real-time information.'
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        }))
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'weather',
            description: 'Get weather information for a location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location to get weather for (city name or coordinates)'
                },
                units: {
                  type: 'string',
                  enum: ['celsius', 'fahrenheit'],
                  description: 'Units for temperature'
                }
              },
              required: ['location']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'google_search',
            description: 'Search the web using Google Custom Search API',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to execute'
                },
                num_results: {
                  type: 'number',
                  description: 'Number of results to return (max 10)',
                  default: 3
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'system_info',
            description: 'Get time and location information',
            parameters: {
              type: 'object',
              properties: {
                info_type: {
                  type: 'string',
                  enum: ['time', 'location', 'all'],
                  description: 'Type of information to retrieve',
                  default: 'all'
                }
              }
            }
          }
        }
      ],
      tool_choice: 'auto'
    });

    const response = completion.choices[0].message;
    
    // Handle tool calls if present
    if (response.tool_calls) {
      const toolResults = await Promise.all(
        response.tool_calls.map(async (toolCall) => {
          if (toolCall.function.name === 'weather') {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await weatherTool.execute(
              { 
                request: args,
                response: {},
                state: new Map(),
                config: mcpServer['config'],
                logger: mcpServer['logger']
              },
              args
            );
            return { toolCall, result };
          }
          if (toolCall.function.name === 'google_search') {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await searchTool.execute(
              {
                request: args,
                response: {},
                state: new Map(),
                config: mcpServer['config'],
                logger: mcpServer['logger']
              },
              args
            );
            return { toolCall, result };
          }
          if (toolCall.function.name === 'system_info') {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await systemTool.execute(
              {
                request: args,
                response: {},
                state: new Map(),
                config: mcpServer['config'],
                logger: mcpServer['logger']
              },
              args
            );
            return { toolCall, result };
          }
          return null;
        })
      );

      // Create a follow-up message with tool results
      const followUp = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [
          ...messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
          response,
          ...toolResults.map(tr => tr && ({
            role: 'tool',
            tool_call_id: tr.toolCall.id,
            content: JSON.stringify(tr.result)
          })).filter(Boolean)
        ]
      });

      return new Response(
        JSON.stringify({
          content: followUp.choices[0].message.content,
          toolCalls: response.tool_calls?.map(tc => ({
            name: tc.function.name,
            args: tc.function.arguments
          }))
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        content: response.content,
        toolCalls: response.tool_calls?.map(tc => ({
          name: tc.function.name,
          args: tc.function.arguments
        }))
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 