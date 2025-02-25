import { tool } from 'ai';
import { z } from 'zod';
import { ToolResult } from './ToolResult';

export interface SystemData {
  time: {
    current: string;
    timestamp: number;
    timezone: string;
    localTime: string;
  };
  location: {
    timezone: string;
  };
}

export type SystemResult = ToolResult<SystemData>;

const formatSystemResult = (data: SystemData, info_type: 'time' | 'location' | 'all'): string => {
  const parts = [];
  if (info_type === 'all' || info_type === 'time') {
    parts.push(`**Current Time**: ${data.time.localTime}`);
  }
  if (info_type === 'all' || info_type === 'location') {
    parts.push(`**Timezone**: ${data.location.timezone}`);
  }
  return parts.join('\n');
};

export const systemTool = tool({
  description: 'Get time and location information',
  parameters: z.object({
    info_type: z.enum(['time', 'location', 'all']).optional().default('all')
      .describe('Type of information to retrieve (time, location, all)')
  }),
  execute: async ({ info_type = 'all' }): Promise<SystemResult> => {
    try {
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const data: SystemData = {
        time: {
          current: now.toISOString(),
          timestamp: now.getTime(),
          timezone,
          localTime: now.toLocaleString(),
        },
        location: {
          timezone,
        }
      };

      return {
        success: true,
        data,
        message: formatSystemResult(data, info_type)
      };

    } catch (error) {
      return {
        success: false,
        data: {} as SystemData,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to fetch system information'
      };
    }
  }
}); 