import { tool } from 'ai';
import { z } from 'zod';
import { ToolResult } from './ToolResult';

export interface WeatherData {
  location: string;
  temperature: number;
  units: string;
  conditions: string;
  timestamp: string;
}

export type WeatherResult = ToolResult<WeatherData>;

const formatWeatherResult = (data: WeatherData): string => {
  return `**Current Weather**: ${data.temperature}°${data.units} and ${data.conditions} in ${data.location}.`;
};

export const weatherTool = tool({
  description: 'Get weather information for a location',
  parameters: z.object({
    location: z.string().describe('Location to get weather for (city name or coordinates)'),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
      .describe('Units for temperature (celsius or fahrenheit)')
  }),
  execute: async ({ location, units = 'celsius' }): Promise<WeatherResult> => {
    try {
      // This is a mock implementation
      const data: WeatherData = {
        location,
        temperature: 22,
        units,
        conditions: 'sunny',
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        data,
        message: formatWeatherResult(data)
      };

    } catch (error) {
      return {
        success: false,
        data: {} as WeatherData,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to fetch weather data'
      };
    }
  }
}); 