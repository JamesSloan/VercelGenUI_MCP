import { MCPContext } from '../lib/mcp/server';

export interface ToolDefinition {
  name: string;
  description: string;
  version: string;
  parameters: ToolParameter[];
  execute: (context: MCPContext, params: Record<string, any>) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ToolRegistration {
  tool: ToolDefinition;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ToolExecutionContext extends MCPContext {
  toolName: string;
  parameters: Record<string, any>;
  startTime: number;
  timeout?: number;
} 