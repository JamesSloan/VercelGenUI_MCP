export interface ToolResult<T = any> {
  success: boolean;
  data: T;
  error?: string;
  message: string;
} 