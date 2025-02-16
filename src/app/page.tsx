'use client';

import { useState } from 'react';
import { Message, continueConversation } from './actions';
import { readStreamableValue } from 'ai/rsc';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define a type for our conversation messages that includes required id
type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default function Home() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      console.log('Client: Sending message:', input);

      // Add user message to conversation immediately
      const userMessage: Message = { role: 'user', content: input.trim() };
      const newConversation = [...conversation, userMessage];
      setConversation(newConversation);
      setInput('');

      // Get the response
      console.log('Client: Calling continueConversation');
      const { messages, newMessage } = await continueConversation(newConversation);
      console.log('Client: Got response from server');

      if (!newMessage) {
        throw new Error('No message received from server');
      }

      // Add empty assistant message to show loading
      const loadingMessage: Message = { role: 'assistant', content: '' };
      setConversation([...newConversation, loadingMessage]);

      let accumulatedContent = '';
      console.log('Client: Starting to read stream');

      try {
        for await (const chunk of readStreamableValue(newMessage)) {
          console.log('Client: Received chunk:', chunk);
          if (chunk) {
            accumulatedContent += chunk;
            console.log('Client: Accumulated content:', accumulatedContent);
            
            // Update the assistant's message with accumulated content
            setConversation(currentConversation => {
              const updatedConversation = [...currentConversation];
              // Find and update the last assistant message
              const lastAssistantIndex = updatedConversation.findIndex(
                msg => msg.role === 'assistant'
              );
              if (lastAssistantIndex !== -1) {
                updatedConversation[lastAssistantIndex] = {
                  role: 'assistant',
                  content: accumulatedContent
                };
              }
              return updatedConversation;
            });
          }
        }
        console.log('Client: Finished reading stream');
      } catch (streamError) {
        console.error('Client: Error reading stream:', streamError);
        throw streamError;
      }

      if (!accumulatedContent) {
        throw new Error('No content received from stream');
      }
    } catch (error) {
      console.error('Client: Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'An unknown error occurred'
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="w-full max-w-4xl flex flex-col h-screen pt-4">
        <h1 className="text-4xl font-bold mb-4 text-center text-gray-800">
          AI Chat Assistant
        </h1>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
          {conversation.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              Start a conversation by sending a message below.
            </div>
          )}
          
          {conversation.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                } shadow-sm`}
              >
                {message.content || (message.role === 'assistant' && isLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                ))}
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