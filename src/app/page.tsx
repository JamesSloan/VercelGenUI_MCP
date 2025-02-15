'use client';

import React, { useState, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: {
    name: string;
    args: string;
  }[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add AI message with tool calls if present
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        toolCalls: data.toolCalls
      }]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
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
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-20">
              Start a conversation by sending a message below.
            </div>
          )}
          
          {messages.map((message) => (
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
                {message.role === 'assistant' ? (
                  <>
                    <ReactMarkdown
                      className="prose prose-sm max-w-none"
                      components={{
                        pre: ({ node, ...props }) => (
                          <div className="overflow-auto my-2 p-2 bg-gray-800 rounded-md">
                            <pre {...props} />
                          </div>
                        ),
                        code: ({ node, ...props }) => (
                          <code className="bg-gray-800 text-gray-100 p-1 rounded-sm" {...props} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                        <div className="font-medium">Tools Used:</div>
                        {message.toolCalls.map((tool, idx) => (
                          <div key={idx} className="flex items-center gap-2 mt-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {tool.name}
                            </span>
                            <span className="text-gray-600 truncate">
                              args: {tool.args}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[85%] shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-sm mb-4 px-4">
            Error: {error.message}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
} 