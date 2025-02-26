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
  
  // Format results as HTML for better display
  const formattedResults = data.map((item, index) => 
    `<div class="search-result p-2 mb-2 bg-white rounded-md border border-gray-100">
      <div class="font-medium">${index + 1}. ${item.title}</div>
      <div class="text-sm">${item.snippet}</div>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">${item.link}</a>` : ''}
    </div>`
  ).join('');
  
  return `<div class="search-results">
    <div class="font-medium mb-2">Found ${data.length} results for "${query}":</div>
    ${formattedResults}
  </div>`;
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