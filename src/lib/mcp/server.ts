import { Logger } from '../utils/logger';

export interface MCPServerConfig {
  apiKey?: string;
  baseUrl?: string;
  debug?: boolean;
  maxConcurrentRequests?: number;
}

export interface MCPMiddleware {
  (context: MCPContext, next: () => Promise<void>): Promise<void>;
}

export interface MCPContext {
  request: any;
  response: any;
  state: Map<string, any>;
  config: MCPServerConfig;
  logger: Logger;
}

export class MCPServer {
  private config: MCPServerConfig;
  private middlewares: MCPMiddleware[] = [];
  private logger: Logger;

  constructor(config: MCPServerConfig = {}) {
    this.config = {
      debug: false,
      maxConcurrentRequests: 10,
      ...config,
    };
    this.logger = new Logger({ debug: this.config.debug });
  }

  use(middleware: MCPMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: Partial<MCPContext>): Promise<void> {
    const ctx: MCPContext = {
      request: context.request || {},
      response: context.response || {},
      state: new Map(),
      config: this.config,
      logger: this.logger,
    };

    let index = 0;
    const runner = async (): Promise<void> => {
      if (index >= this.middlewares.length) return;
      const middleware = this.middlewares[index++];
      await middleware(ctx, runner);
    };

    try {
      await runner();
    } catch (error) {
      this.logger.error('Error executing middleware chain:', error);
      throw error;
    }
  }
} 