'use server';

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from 'ai/rsc';
import { MCPServer } from '../lib/mcp/server';
import { weatherTool } from '../lib/mcp/tools/weather';
import { searchTool } from '../lib/mcp/tools/search';
import { systemTool } from '../lib/mcp/tools/system';

// Initialize MCP Server
const mcpServer = new MCPServer({ debug: true });
mcpServer.use(async (context, next) => {
  context.state.set('tools', [weatherTool, searchTool, systemTool]);
  await next();
});

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function continueConversation(history: Message[]) {
  'use server';

  console.log('Server: Starting conversation with history:', JSON.stringify(history, null, 2));
  const stream = createStreamableValue();

  (async () => {
    try {
      console.log('Server: Initializing streamText');
      const { textStream } = await streamText({
        model: openai('gpt-4o-mini'),
        system: 'You are a helpful assistant with access to various tools. You can use these tools to provide real-time information.',
        messages: history
      });

      console.log('Server: StreamText initialized, starting to process stream');

      for await (const text of textStream) {
        console.log('Server: Received text chunk:', text);
        if (text) {
          stream.update(text);
          console.log('Server: Sent chunk to client:', text);
        }
      }

      console.log('Server: Stream processing completed');
    } catch (error) {
      console.error('Server: Error in stream processing:', error);
      stream.update('An error occurred while generating the response.');
    }

    stream.done();
    console.log('Server: Stream marked as done');
  })();

  return {
    messages: history,
    newMessage: stream.value,
  };
} 