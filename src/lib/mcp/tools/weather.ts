import { ToolDefinition, ToolResult } from '../../../types/tools';
import { MCPContext } from '../server';

export const weatherTool: ToolDefinition = {
  name: 'weather',
  description: 'Get weather information for a location',
  version: '1.0.0',
  parameters: [
    {
      name: 'location',
      type: 'string',
      description: 'Location to get weather for (city name or coordinates)',
      required: true,
    },
    {
      name: 'units',
      type: 'string',
      description: 'Units for temperature (celsius or fahrenheit)',
      required: false,
      default: 'celsius',
    },
  ],
  execute: async (context: MCPContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      // This is a mock implementation
      context.logger.logDebug('Executing dummy weather tool with params:', params);
      
      return {
        success: true,
        data: {
          location: params.location,
          temperature: 22,
          units: params.units || 'celsius',
          conditions: 'sunny',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WEATHER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  },
}; 