import { MCPServer, MCPContext, MCPMiddleware } from '../server';

describe('MCPServer', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer({ debug: true });
  });

  test('should initialize with default config', () => {
    expect(server).toBeInstanceOf(MCPServer);
  });

  test('should execute middleware chain', async () => {
    const steps: string[] = [];
    
    const middleware1: MCPMiddleware = async (ctx, next) => {
      steps.push('before1');
      await next();
      steps.push('after1');
    };

    const middleware2: MCPMiddleware = async (ctx, next) => {
      steps.push('before2');
      await next();
      steps.push('after2');
    };

    server.use(middleware1).use(middleware2);
    await server.execute({});

    expect(steps).toEqual(['before1', 'before2', 'after2', 'after1']);
  });

  test('should handle middleware errors', async () => {
    const errorMiddleware: MCPMiddleware = async () => {
      throw new Error('Test error');
    };

    server.use(errorMiddleware);
    await expect(server.execute({})).rejects.toThrow('Test error');
  });
}); 