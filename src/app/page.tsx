'use client';

import React, { useState, FormEvent, useRef } from 'react';
import { readStreamableValue } from 'ai/rsc';
import { continueConversation } from './actions';
import { ResponseContainer, EnhancedMessage, StepCall } from './components/ResponseContainer';

export default function Home() {
  const [conversation, setConversation] = useState<EnhancedMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const currentStepsRef = useRef<StepCall[]>([]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      currentStepsRef.current = []; // Reset steps for new message

      // Add user message to conversation immediately
      const userMessage: EnhancedMessage = { 
        id: Date.now().toString(),
        role: 'user', 
        content: input.trim(),
        state: 'final'
      };
      const newConversation = [...conversation, userMessage];
      setConversation(newConversation);
      setInput('');

      // Get the response
      const { messages, newMessage } = await continueConversation(newConversation);
      if (!newMessage) {
        throw new Error('No message received from server');
      }

      // Add empty assistant message to show loading
      const assistantMessage: EnhancedMessage = { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: '',
        steps: [],
        state: 'thinking'
      };
      setConversation([...newConversation, assistantMessage]);

      try {
        for await (const chunk of readStreamableValue(newMessage)) {
          if (chunk) {
            const parsedChunk = JSON.parse(chunk);
            
            // Handle tool steps
            if (parsedChunk.type === 'tool-step') {
              const newStep = parsedChunk.step;
              console.log('Received tool step:', newStep);
              
              // Create a new array to trigger React state update
              const updatedSteps = [...currentStepsRef.current];
              const existingStepIndex = updatedSteps.findIndex(
                s => s.type === newStep.type && s.name === newStep.name && s.args === newStep.args
              );
              
              if (existingStepIndex !== -1) {
                // Update existing step
                updatedSteps[existingStepIndex] = {
                  ...updatedSteps[existingStepIndex],
                  ...newStep
                };
              } else {
                // Add new step
                updatedSteps.push(newStep);
              }
              
              // Update the ref with the new array
              currentStepsRef.current = updatedSteps;
              
              console.log('Current steps:', currentStepsRef.current);
              updateAssistantMessage(assistantMessage.id, {
                steps: updatedSteps,
                state: 'intermediate'
              });
            }

            // Handle content - update message content
            if (parsedChunk.content !== undefined) {
              console.log('Received content update:', parsedChunk);
              
              // Always use the steps from the content update if available
              let updatedSteps = currentStepsRef.current;
              
              // If this is a content update with steps, use those steps
              if (parsedChunk.type === 'content-update' && Array.isArray(parsedChunk.steps)) {
                updatedSteps = [...parsedChunk.steps];
                // Update our ref to keep track of the latest steps
                currentStepsRef.current = updatedSteps;
                console.log('Updated steps from content update:', updatedSteps);
              }
              
              updateAssistantMessage(assistantMessage.id, {
                content: parsedChunk.content,
                steps: updatedSteps,
                state: parsedChunk.isFinal ? 'final' : (parsedChunk.isToolResponse ? 'intermediate' : 'final')
              });
            }
          }
        }

        // Ensure final state
        updateAssistantMessage(assistantMessage.id, {
          steps: currentStepsRef.current.map(step => ({
            ...step,
            status: step.status || 'complete'
          })),
          state: 'final'
        });

      } catch (streamError) {
        console.error('Error reading stream:', streamError);
        throw streamError;
      }
    } catch (error) {
      console.error('Error:', error);
      setConversation(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred',
        state: 'final'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to update assistant message
  const updateAssistantMessage = (id: string, update: Partial<EnhancedMessage>) => {
    console.log('Updating assistant message:', { id, update, stepsCount: update.steps?.length });
    setConversation(currentConversation => {
      const updatedConversation = [...currentConversation];
      const index = updatedConversation.findIndex(
        msg => msg.role === 'assistant' && msg.id === id
      );
      if (index !== -1) {
        // Create a deep copy of the steps array to ensure React detects the change
        const updatedSteps = update.steps 
          ? [...update.steps] 
          : updatedConversation[index].steps 
            ? [...updatedConversation[index].steps] 
            : [];
            
        const newMessage = {
          ...updatedConversation[index],
          ...update,
          steps: updatedSteps
        };
        console.log('Updated message:', { 
          id: newMessage.id, 
          content: newMessage.content?.substring(0, 50), 
          stepsCount: newMessage.steps?.length,
          state: newMessage.state
        });
        updatedConversation[index] = newMessage;
      } else {
        console.log('Message not found:', id);
      }
      return updatedConversation;
    });
  };
  console.log('message', conversation);
  //console.log('Current conversation:', conversation);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl flex flex-col h-screen pt-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-center text-gray-800">
            AI Chat Assistant
          </h1>
          <button 
            onClick={() => setDebugMode(!debugMode)} 
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            {debugMode ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>

        {debugMode && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
            <pre>{JSON.stringify(conversation.map(msg => ({
              id: msg.id,
              role: msg.role,
              stepsCount: msg.steps?.length || 0,
              state: msg.state
            })), null, 2)}</pre>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-lg border border-gray-200 bg-gray-100">
          {conversation.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              Start a conversation by sending a message below.
            </div>
          )}
          
          {conversation.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[85%] ${
                message.role === 'user' ? 'bg-blue-500 text-white rounded-lg px-4 py-2' : ''
              }`}>
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <ResponseContainer 
                    message={message}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <div className="flex gap-2 p-4 border-t">
          <input
            type="text"
            value={input}
            onChange={event => {
              setInput(event.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Thinking...' : 'Send Message'}
          </button>
        </div>
      </div>
    </main>
  );
} 