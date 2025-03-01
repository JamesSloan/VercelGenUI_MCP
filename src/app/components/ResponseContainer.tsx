'use client';

import React from 'react';
import { Message } from '../actions';

export interface StepCall {
  type: 'tool' | 'llm';
  name: string;
  args?: string;
  result?: string;
  summary?: string;  // Human-readable summary of the result
  timestamp?: number;
  status?: 'pending' | 'complete' | 'error';
}

export interface EnhancedMessage extends Message {
  id: string;
  state?: 'thinking' | 'intermediate' | 'final';
  stepNumber?: number;
  isCollapsed?: boolean;
  steps?: StepCall[];
  toolCalls?: Message['toolCalls']; // Keep for backward compatibility
}

interface ResponseContainerProps {
  message: EnhancedMessage;
  isLoading: boolean;
}

const ThinkingIndicator = () => (
  <div className="flex items-center space-x-2 text-gray-500">
    <span>Thinking</span>
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
    </div>
  </div>
);

// TODO: Add a streaming response indicator that shows when content is being streamed
const StreamingIndicator = () => (
  <div className="inline-flex items-center space-x-1 text-gray-500 ml-1">
    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-150" />
    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300" />
  </div>
);

const StepIcon = ({ type }: { type: StepCall['type'] }) => {
  if (type === 'llm') {
    return (
      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
};

// Helper function to format markdown-like content
const formatMarkdown = (content: string) => {
  if (!content) return null;
  
  // Replace **text** with bold
  const boldFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Replace links with anchor tags
  const linkFormatted = boldFormatted.replace(
    /\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, 
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
  );
  
  // Format search results better
  let formattedContent = linkFormatted;
  if (content.includes('Found') && content.includes('results for')) {
    formattedContent = formattedContent.replace(
      /(Found \d+ results for ".*?":)([\s\S]*)/,
      (match, header, results) => {
        const formattedResults = results.replace(
          /(\d+\.\s+)(.*?)(\s+Link:\s+)(https?:\/\/[^\s]+)/g,
          '<div class="mt-2 p-2 bg-white rounded-md border border-gray-100">$1<strong>$2</strong><br/><a href="$4" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">$4</a></div>'
        );
        return `<div class="font-medium mb-2">${header}</div>${formattedResults}`;
      }
    );
  }
  
  // Format tables better
  if (content.includes('|') && content.includes('\n|')) {
    formattedContent = formattedContent.replace(
      /(\|.*\|\n\|[-\s|]*\|)([\s\S]*?)(\n\n|$)/g,
      (match, header, rows) => {
        const tableHeader = header.replace(/\|/g, '<td class="border px-4 py-2 bg-gray-100 font-medium">').replace(/\n/g, '</td></tr>\n<tr>');
        const tableRows = rows.replace(/\|/g, '<td class="border px-4 py-2">').replace(/\n/g, '</td></tr>\n<tr>');
        return `<div class="overflow-x-auto mt-2 mb-4"><table class="min-w-full border-collapse border border-gray-300 rounded-md"><tr>${tableHeader}</td></tr><tr>${tableRows}</td></tr></table></div>`;
      }
    );
  }
  
  return (
    <div dangerouslySetInnerHTML={{ __html: formattedContent }} />
  );
};

// Helper function to render content that might be HTML or plain text
const renderContent = (content: string) => {
  if (!content) return null;
  
  // Try to parse as JSON first (for tool results that might be stringified)
  try {
    if (content.startsWith('{') && content.endsWith('}')) {
      const parsed = JSON.parse(content);
      // If it has a message property that looks like HTML, render that
      if (parsed.message && typeof parsed.message === 'string' && 
          (parsed.message.includes('<') || parsed.message.includes('&lt;'))) {
        return <div dangerouslySetInnerHTML={{ __html: parsed.message }} className="html-content" />;
      }
      // Otherwise just stringify it nicely
      return <pre className="text-xs overflow-auto">{JSON.stringify(parsed, null, 2)}</pre>;
    }
  } catch (e) {
    // Not valid JSON, continue with other checks
  }
  
  // Check if content appears to be HTML
  const containsHtml = /<[a-z][\s\S]*>/i.test(content) || 
                      content.includes('&lt;') || 
                      content.includes('<svg') || 
                      content.includes('<div');
  
  // If it contains HTML, render it directly
  if (containsHtml) {
    // Ensure SVG tags are properly rendered
    let processedContent = content;
    if (content.includes('&lt;svg')) {
      processedContent = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    return <div dangerouslySetInnerHTML={{ __html: processedContent }} className="html-content" />;
  }
  
  // If it contains markdown-style formatting, use the formatter
  if (content.includes('**') || content.includes('|') || 
      content.includes('Found') || content.includes('[')) {
    return formatMarkdown(content);
  }
  
  // Otherwise, render as plain text
  return <div>{content}</div>;
};

const StepsList = ({ message }: { message: EnhancedMessage }) => {
  // Convert legacy toolCalls to new steps format if needed
  const steps: StepCall[] = message.steps || (message.toolCalls?.map(tool => ({
    type: 'tool',
    name: tool.name,
    args: tool.args,
    timestamp: Date.now()
  })) || []);
  
  console.log('StepsList render:', {
    messageId: message.id,
    messageSteps: message.steps,
    toolCalls: message.toolCalls,
    convertedSteps: steps,
    messageState: message.state,
    stepsLength: steps?.length || 0
  });
  
  if (!steps || steps.length === 0) {
    console.log('No steps to display for message:', message.id);
    return null;
  }
  
  // Default to collapsed
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  
  return (
    <div className="mt-4 text-sm border border-gray-200 rounded-md bg-white p-2">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="font-medium text-gray-700">
          Steps ({steps.length})
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="space-y-2 mt-2 pl-4 pr-2">
          {steps.map((step, idx) => (
            <div 
              key={`${step.type || 'unknown'}-${step.name || 'unnamed'}-${step.timestamp || Date.now()}-${idx}`} 
              className="flex items-start gap-2 text-gray-600 group hover:bg-gray-50 p-2 rounded-lg transition-colors border border-gray-100"
            >
              <div className="mt-1">
                <StepIcon type={step.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    step.type === 'llm' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {step.name}
                  </span>
                  {step.status === 'pending' && (
                    <span className="text-xs text-yellow-600 animate-pulse">Running...</span>
                  )}
                  {step.timestamp && (
                    <span className="text-xs text-gray-400">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                {step.args && (
                  <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-50 p-1 rounded">
                    {typeof step.args === 'string' ? step.args : JSON.stringify(step.args, null, 2)}
                  </div>
                )}
                {step.summary && (
                  <div className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border border-gray-100">
                    {typeof step.summary === 'string' 
                      ? renderContent(step.summary)
                      : step.summary}
                  </div>
                )}
                {step.result && !step.summary && (
                  <div className={`text-xs text-gray-600 mt-1 p-2 rounded overflow-auto ${
                    typeof step.result === 'string' && 
                    (step.result.includes('<div') || step.result.includes('<span') || step.result.includes('<svg'))
                      ? 'bg-white' 
                      : 'bg-gray-50 font-mono'
                  }`}>
                    {typeof step.result === 'string' 
                      ? (step.result.startsWith('{') && step.result.endsWith('}')
                          ? renderContent(step.result)
                          : renderContent(step.result))
                      : JSON.stringify(step.result, null, 2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ResponseContainer: React.FC<ResponseContainerProps> = ({
  message,
  isLoading
}) => {
  const isThinking = isLoading && (!message.content || message.state === 'thinking');
  const isStreaming = isLoading && message.content && message.state === 'intermediate';
  
  // Filter out LLM steps from the steps display
  // TODO: Add a proper LLM call tool in the future
  const filteredSteps = message.steps?.filter(step => step.type !== 'llm') || [];
  const showSteps = filteredSteps.length > 0 || (message.toolCalls?.length ?? 0) > 0;

  console.log('ResponseContainer render:', {
    messageId: message.id,
    isLoading,
    isThinking,
    isStreaming,
    showSteps,
    stepsLength: filteredSteps.length,
    toolCallsLength: message.toolCalls?.length,
    messageState: message.state,
    messageContent: message.content?.substring(0, 50)
  });

  React.useEffect(() => {
    console.log('ResponseContainer mounted/updated with steps:', {
      messageId: message.id,
      stepsLength: filteredSteps.length,
      steps: filteredSteps
    });
  }, [message.id, message.steps]);

  return (
    <div className="rounded-lg px-4 py-3 bg-white text-gray-800 shadow-sm border border-gray-200">
      {isThinking ? (
        <ThinkingIndicator />
      ) : (
        <div className="flex flex-col">
          <div className="whitespace-pre-wrap prose prose-sm max-w-none">
            {renderContent(message.content)}
            {isStreaming && <StreamingIndicator />}
          </div>
          
          {showSteps && (
            <div className="w-full">
              <StepsList message={{...message, steps: filteredSteps}} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 