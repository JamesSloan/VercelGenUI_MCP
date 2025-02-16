import { ToolDefinition, ToolResult } from '../../../types/tools';
import { MCPContext } from '../server';

export const systemTool: ToolDefinition = {
  name: 'system_info',
  description: 'Get time and location information',
  version: '1.0.0',
  parameters: [
    {
      name: 'info_type',
      type: 'string',
      description: 'Type of information to retrieve (time, location, all)',
      required: false,
      default: 'all',
    }
  ],
  execute: async (context: MCPContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      context.logger.logDebug('Executing time/location info tool with params:', params);
      
      const infoType = params.info_type?.toLowerCase() || 'all';
      const result: Record<string, any> = {};

      if (infoType === 'all' || infoType === 'time') {
        const now = new Date();
        result.time = {
          current: now.toISOString(),
          timestamp: now.getTime(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: now.toLocaleString(),
        };
      }

      if (infoType === 'all' || infoType === 'location') {
        result.location = {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      context.logger.error('Time/location info error:', error);
      return {
        success: false,
        error: {
          code: 'TIME_LOCATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };
    }
  },
}; 