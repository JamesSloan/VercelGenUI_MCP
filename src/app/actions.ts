'use server';

import { streamText, ToolSet } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from 'ai/rsc';
import { weatherTool } from '../lib/mcp/tools/weather';
import { searchTool } from '../lib/mcp/tools/search';
import { systemTool } from '../lib/mcp/tools/system';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: {
    name: string;
    args: string;
  }[];
}

const tools = {
  weather: weatherTool,
  search: searchTool,
  system: systemTool
} satisfies ToolSet;

// Generate system prompt from tools
const generateSystemPrompt = (toolSet: ToolSet) => {
  const toolDescriptions = Object.entries(toolSet)
    .map(([name, tool]) => `- ${name}: ${tool.description}`)
    .join('\n');

  return `You are a helpful assistant that can respond with your own knowledge and with access to the following tools:
${toolDescriptions}

When a user's request matches a tool's purpose, use that tool to provide accurate information.
If they don't provide enough information for the tool to work, use the other tools or ask for more details.
For example if they as what the weather is, assume they are asking for the weather in their current location.
Format your responses in a clear and concise way.
You don't have to use the tools if you don't need to.`;
};

export async function continueConversation(history: Message[]) {
  'use server';
  
  console.log('Server: Starting conversation with history:', JSON.stringify(history, null, 2));
  const stream = createStreamableValue();

  try {
    let accumulatedContent = '';
    let currentToolCalls: Message['toolCalls'] = [];
    let steps: Array<{
      text: string;
      toolCalls?: Array<{ toolName: string; args: any }>;
      toolResults?: Array<any>;
    }> = [];

    const { textStream } = await streamText({
      model: openai('gpt-4o-mini'),
      messages: history,
      tools,
      system: generateSystemPrompt(tools),
      maxSteps: 5, // Allow multiple tool calls if needed
      onStepFinish(step) {
        console.log('Step finished:', step);
        steps.push(step);

        // Update tool calls if any
        if (step.toolCalls?.length) {
          currentToolCalls = step.toolCalls.map(call => ({
            name: call.toolName,
            args: JSON.stringify(call.args)
          }));
        }

        // Format content with tool results if any
        let stepContent = step.text || '';
        if (step.toolResults?.length) {
          stepContent += '\n' + step.toolResults
            .map(result => result.result?.message || JSON.stringify(result))
            .join('\n');
        }
        
        accumulatedContent = steps
          .map(s => {
            let content = s.text || '';
            if (s.toolResults?.length) {
              content += '\n' + s.toolResults
                .map(result => result.result?.message || JSON.stringify(result))
                .join('\n');
            }
            return content;
          })
          .join('\n')
          .trim();

        // Update stream with current state
        stream.update(JSON.stringify({ 
          content: accumulatedContent,
          toolCalls: currentToolCalls
        }));
      }
    });

    // Handle text stream for intermediate updates
    for await (const chunk of textStream) {
      if (chunk) {
        // Only update with new chunks if we have no steps yet
        if (steps.length === 0) {
          accumulatedContent += chunk;
          stream.update(JSON.stringify({ 
            content: accumulatedContent,
            toolCalls: currentToolCalls
          }));
        }
      }
    }

    if (!accumulatedContent.trim()) {
      throw new Error('No content received from stream');
    }

    stream.done();
  } catch (error) {
    console.error('Server: Error in conversation:', error);
    stream.update(JSON.stringify({ 
      content: error instanceof Error ? error.message : 'An error occurred while processing your request.'
    }));
    stream.done();
  }

  return {
    messages: history,
    newMessage: stream.value,
  };
} 