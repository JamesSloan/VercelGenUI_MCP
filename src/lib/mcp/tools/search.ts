import { customsearch } from '@googleapis/customsearch';
import { ToolDefinition, ToolResult } from '../../../types/tools';
import { MCPContext } from '../server';

const searchClient = customsearch('v1');

export const searchTool: ToolDefinition = {
  name: 'google_search',
  description: 'Search the web using Google Custom Search API',
  version: '1.0.0',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'The search query to execute',
      required: true,
    },
    {
      name: 'num_results',
      type: 'number',
      description: 'Number of results to return (max 10)',
      required: false,
      default: 3,
    }
  ],
  execute: async (context: MCPContext, params: Record<string, any>): Promise<ToolResult> => {
    try {
      context.logger.logDebug('Executing Google search with params:', params);
      
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        throw new Error('Google API credentials not configured');
      }

      const numResults = Math.min(Math.max(1, params.num_results || 3), 10);

      const response = await searchClient.cse.list({
        auth: apiKey,
        cx: searchEngineId,
        q: params.query,
        num: numResults
      });

      if (!response.data.items) {
        return {
          success: true,
          data: {
            results: [],
            total: 0,
            message: 'No results found'
          }
        };
      }

      const results = response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink
      }));

      return {
        success: true,
        data: {
          results,
          total: response.data.searchInformation?.totalResults || results.length,
          query: params.query
        }
      };

    } catch (error) {
      context.logger.error('Google search error:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };
    }
  },
}; 