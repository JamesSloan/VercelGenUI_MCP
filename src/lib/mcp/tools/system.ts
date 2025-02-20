import { tool } from 'ai';
import { z } from 'zod';

export const systemTool = tool({
  description: 'Get time and location information',
  parameters: z.object({
    info_type: z.enum(['time', 'location', 'all']).optional().default('all')
      .describe('Type of information to retrieve (time, location, all)')
  }),
  execute: async ({ info_type = 'all' }) => {
    try {
      const result: Record<string, any> = {};

      if (info_type === 'all' || info_type === 'time') {
        const now = new Date();
        result.time = {
          current: now.toISOString(),
          timestamp: now.getTime(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          localTime: now.toLocaleString(),
        };
      }

      if (info_type === 'all' || info_type === 'location') {
        result.location = {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      // Format a nice response message
      const parts = [];
      if (result.time) {
        parts.push(`Current time: ${result.time.localTime} (${result.time.timezone})`);
      }
      if (result.location) {
        parts.push(`System timezone: ${result.location.timezone}`);
      }

      return {
        success: true,
        data: result,
        message: parts.join('\n')
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_LOCATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
}); 