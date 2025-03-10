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
  // Format system info as HTML for better display
  const timeHtml = `
    <div class="flex items-center mb-2">
      <span class="mr-2 text-xl">🕒</span>
      <span class="font-medium">Current Time:</span>
      <span class="ml-2">${data.time.localTime}</span>
    </div>
  `;
  
  const locationHtml = `
    <div class="flex items-center">
      <span class="mr-2 text-xl">📍</span>
      <span class="font-medium">Timezone:</span>
      <span class="ml-2">${data.location.timezone}</span>
    </div>
  `;
  
  let content = '';
  if (info_type === 'all' || info_type === 'time') {
    content += timeHtml;
  }
  if (info_type === 'all' || info_type === 'location') {
    content += locationHtml;
  }
  
  return `<div class="system-info p-3 bg-gray-50 rounded-lg border border-gray-200">${content}</div>`;
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