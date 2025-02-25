import { tool } from 'ai';
import { z } from 'zod';
import { ToolResult } from './ToolResult';

export interface SearchItem {
  title: string;
  snippet: string;
  link?: string;
}

export type SearchData = SearchItem[];

export type SearchResult = ToolResult<SearchData>;

const formatSearchResult = (data: SearchData, query: string): string => {
  if (data.length === 0) {
    return `No results found for "${query}"`;
  }
  
  const formattedResults = data.map((item, index) => 
    `${index + 1}. ${item.title}\n${item.snippet}${item.link ? `\nLink: ${item.link}` : ''}`
  ).join('\n\n');
  
  return `Found ${data.length} results for "${query}":\n\n${formattedResults}`;
};

export const searchTool = tool({
  description: 'Search for information',
  parameters: z.object({
    query: z.string().describe('Search query'),
    type: z.enum(['web', 'news', 'images']).optional().default('web')
      .describe('Type of search to perform')
  }),
  execute: async ({ query, type = 'web' }): Promise<SearchResult> => {
    try {
      // This is a mock implementation
      const data: SearchData = [
        {
          title: 'Mock Search Result 1',
          snippet: 'This is a mock search result for: ' + query,
          link: 'https://example.com/1'
        },
        {
          title: 'Mock Search Result 2',
          snippet: 'Another mock result for: ' + query,
          link: 'https://example.com/2'
        }
      ];

      return {
        success: true,
        data,
        message: formatSearchResult(data, query)
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to perform search'
      };
    }
  }
}); 