import { customsearch } from '@googleapis/customsearch';
import { tool } from 'ai';
import { z } from 'zod';

export const searchTool = tool({
  description: 'Search the web using Google Custom Search API',
  parameters: z.object({
    query: z.string().describe('The search query to execute'),
    num_results: z.number().min(1).max(10).optional().default(3)
      .describe('Number of results to return (max 10)')
  }),
  execute: async ({ query, num_results = 3 }) => {
    try {
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        throw new Error('Google API credentials not configured');
      }

      const searchClient = customsearch('v1');
      const response = await searchClient.cse.list({
        auth: apiKey,
        cx: searchEngineId,
        q: query,
        num: Math.min(Math.max(1, num_results), 10)
      });

      if (!response.data.items) {
        return {
          success: true,
          data: {
            results: [],
            total: 0,
            message: 'No results found'
          },
          message: 'No search results found.'
        };
      }

      const results = response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink
      }));

      const formattedResults = results.map((result, index) => 
        `${index + 1}. ${result.title}\n   ${result.snippet}\n   Link: ${result.link}`
      ).join('\n\n');

      return {
        success: true,
        data: {
          results,
          total: response.data.searchInformation?.totalResults || results.length,
          query
        },
        message: `Here are the search results for "${query}":\n\n${formattedResults}`
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
}); 