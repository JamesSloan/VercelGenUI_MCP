import { tool } from 'ai';
import { z } from 'zod';
import { MCPContext } from '../server';

export const weatherTool = tool({
  description: 'Get weather information for a location',
  parameters: z.object({
    location: z.string().describe('Location to get weather for (city name or coordinates)'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
      .describe('Units for temperature (celsius or fahrenheit)')
  }),
  execute: async ({ location, units }) => {
    try {
      // This is a mock implementation
      const weatherData = {
        location,
        temperature: 22,
        units: units || 'celsius',
        conditions: 'sunny',
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data: weatherData,
        message: `Current weather in ${location}: ${weatherData.temperature}°${units} and ${weatherData.conditions}`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WEATHER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      };
    }
  }
}); 