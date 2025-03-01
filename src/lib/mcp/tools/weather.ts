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
  // Get weather emoji based on conditions
  const getWeatherEmoji = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
      return '☀️';  // sun
    } else if (lowerCondition.includes('cloud') && lowerCondition.includes('sun')) {
      return '⛅';  // sun behind cloud
    } else if (lowerCondition.includes('cloud')) {
      return '☁️';  // cloud
    } else if (lowerCondition.includes('rain')) {
      return '🌧️';  // rain
    } else if (lowerCondition.includes('snow')) {
      return '❄️';  // snowflake
    } else if (lowerCondition.includes('thunder') || lowerCondition.includes('lightning')) {
      return '⚡';  // lightning
    } else if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {
      return '🌫️';  // fog
    } else {
      return '🌡️';  // thermometer
    }
  };

  // Format weather result as HTML for better display
  return `<div class="weather-result p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
    <div class="font-medium text-lg mb-2">Weather in ${data.location}</div>
    <div class="flex items-center gap-2 mb-1">
      <span class="text-2xl">${getWeatherEmoji(data.conditions)}</span>
      <span class="text-2xl font-bold">${data.temperature}°${data.units === 'celsius' ? 'C' : 'F'}</span>
      <span class="text-blue-700 capitalize">${data.conditions}</span>
    </div>
    <div class="text-xs text-gray-500 mt-2">Updated: ${new Date(data.timestamp).toLocaleTimeString()}</div>
  </div>`;
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