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
  
  const stream = createStreamableValue();

  try {
    let accumulatedContent = '';
    let currentToolCalls: Message['toolCalls'] = [];
    let currentSteps: Array<{
      type: 'tool' | 'llm';
      name: string;
      args?: string;
      result?: string;
      summary?: string;
      timestamp?: number;
      status?: 'pending' | 'complete' | 'error';
    }> = [];

    const { textStream } = await streamText({
      model: openai('gpt-4o-mini'),
      messages: history,
      tools,
      system: generateSystemPrompt(tools),
      maxSteps: 5,
      onStepFinish(step) {
        //console.log('Step finished:', step);

        // If we have tool calls, send them to the client
        if (step.toolCalls?.length) {
          step.toolCalls.forEach(call => {
            const toolStep = {
              type: 'tool' as const,
              name: call.toolName,
              args: JSON.stringify(call.args),
              timestamp: Date.now(),
              status: 'pending' as const
            };
            currentSteps.push(toolStep);
            stream.update(JSON.stringify({
              type: 'tool-step',
              step: toolStep
            }));
          });
        }

        // If we have tool results, send them to the client
        if (step.toolResults?.length) {
          step.toolResults.forEach((result, index) => {
            if (step.toolCalls?.[index]) {
              const toolResult = {
                type: 'tool' as const,
                name: step.toolCalls[index].toolName,
                args: JSON.stringify(step.toolCalls[index].args),
                result: JSON.stringify(result.result),
                summary: result.result?.message,
                timestamp: Date.now(),
                status: 'complete' as const
              };
              // Update existing step or add new one
              const existingIndex = currentSteps.findIndex(s => 
                s.type === 'tool' && 
                s.name === toolResult.name && 
                s.args === toolResult.args
              );
              if (existingIndex !== -1) {
                currentSteps[existingIndex] = toolResult;
              } else {
                currentSteps.push(toolResult);
              }
              stream.update(JSON.stringify({
                type: 'tool-step',
                step: toolResult
              }));
            }
          });
        }

        // Send LLM text as a step if it exists
        if (step.text?.trim()) {
          const llmStep = {
            type: 'llm' as const,
            name: 'LLM',
            result: step.text,
            timestamp: Date.now(),
            status: 'complete' as const
          };
          currentSteps.push(llmStep);
          stream.update(JSON.stringify({
            type: 'tool-step',
            step: llmStep
          }));
        }

        // Send content update
        let stepContent = '';
        if (step.text?.trim()) {
          stepContent = step.text;
        }
        if (step.toolResults?.length) {
          stepContent = step.toolResults
            .map(result => result.result?.message)
            .filter(Boolean)
            .join('\n');
        }
        
        if (stepContent) {
          // For tool results, we want to show them in the steps
          // For LLM text, we want to show it as the main content
          const contentUpdate = { 
            content: stepContent,
            isToolResponse: step.toolResults?.length > 0,
            type: 'content-update',
            steps: currentSteps
          };
          console.log('Sending content update:', contentUpdate);
          stream.update(JSON.stringify(contentUpdate));
        }
      }
    });

    // Handle text stream for intermediate updates
    for await (const chunk of textStream) {
      if (chunk && currentSteps.length === 0) {
        stream.update(JSON.stringify({ 
          content: chunk,
          steps: currentSteps,
          type: 'content-update'
        }));
      }
    }

    // Send final update with all steps
    // Make sure the final content is the LLM's final response, not the accumulated content
    const finalLlmStep = currentSteps.find(step => step.type === 'llm');
    const finalContent = finalLlmStep?.result || accumulatedContent;
    
    stream.update(JSON.stringify({
      type: 'content-update',
      content: finalContent,
      steps: currentSteps,
      isFinal: true
    }));

    stream.done();
  } catch (error) {
    console.error('Error in conversation:', error);
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