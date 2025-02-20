'use client';

import React, { useState, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStreamableValue } from 'ai/rsc';
import { continueConversation, Message } from './actions';

type ChatMessage = Message & {
  id: string;
};

export default function Home() {
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);
      console.log('Client: Sending message:', input);

      // Add user message to conversation immediately
      const userMessage: ChatMessage = { 
        id: Date.now().toString(),
        role: 'user', 
        content: input.trim() 
      };
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
      const assistantMessage: ChatMessage = { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: '',
      };
      setConversation([...newConversation, assistantMessage]);

      let accumulatedContent = '';
      let toolCalls: any[] = [];
      console.log('Client: Starting to read stream');

      try {
        for await (const chunk of readStreamableValue(newMessage)) {
          if (chunk) {
            const parsedChunk = JSON.parse(chunk);
            
            if (parsedChunk.toolCalls) {
              // If we receive tool calls, update immediately
              toolCalls = parsedChunk.toolCalls;
              accumulatedContent = parsedChunk.content;
            } else {
              // Otherwise accumulate the streaming content
              accumulatedContent += parsedChunk.content;
            }
            
            // Update the assistant's message with accumulated content
            setConversation(currentConversation => {
              const updatedConversation = [...currentConversation];
              const lastAssistantIndex = updatedConversation.findIndex(
                msg => msg.role === 'assistant' && msg.id === assistantMessage.id
              );
              if (lastAssistantIndex !== -1) {
                updatedConversation[lastAssistantIndex] = {
                  ...updatedConversation[lastAssistantIndex],
                  content: accumulatedContent,
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined
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
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
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
          
          {conversation.map((message) => (
            <div
              key={message.id}
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
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                    <div className="font-medium">Tools Used:</div>
                    {message.toolCalls.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-2 mt-1">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {tool.name}
                        </span>
                        <span className="text-gray-600 truncate">
                          args: {typeof tool.args === 'string' ? tool.args : JSON.stringify(tool.args)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {message.role === 'assistant' && !message.content && isLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
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