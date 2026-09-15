declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    /** Optional Workers identity when ChatGPT Sites headers are absent. Empty string disables the fallback. */
    STACKD_DEV_USER_EMAIL?: string;
    IMAGES: {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
        };
      };
    };
  }
}

type Env = Cloudflare.Env;
