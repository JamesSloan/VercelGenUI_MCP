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
  
  // Default to expanded for better visibility
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  return (
    <div className="mt-4 mb-4 text-sm border border-gray-200 rounded-md bg-white p-2">
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
                    {step.summary}
                  </div>
                )}
                {step.result && !step.summary && (
                  <div className="text-xs text-gray-600 mt-1 font-mono bg-gray-50 p-2 rounded overflow-auto">
                    {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
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
  const showSteps = (message.steps?.length ?? 0) > 0 || (message.toolCalls?.length ?? 0) > 0;

  console.log('ResponseContainer render:', {
    messageId: message.id,
    isLoading,
    isThinking,
    showSteps,
    stepsLength: message.steps?.length,
    toolCallsLength: message.toolCalls?.length,
    messageState: message.state,
    messageContent: message.content?.substring(0, 50)
  });

  React.useEffect(() => {
    console.log('ResponseContainer mounted/updated with steps:', {
      messageId: message.id,
      stepsLength: message.steps?.length,
      steps: message.steps
    });
  }, [message.id, message.steps]);

  return (
    <div className="rounded-lg px-4 py-3 bg-gray-100 text-gray-800 shadow-sm">
      {isThinking ? (
        <ThinkingIndicator />
      ) : (
        <div className="flex flex-col">
          {showSteps && (
            <div className="w-full">
              <StepsList message={message} />
            </div>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      )}
    </div>
  );
}; 