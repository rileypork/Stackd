import { register } from "node:module";

// Route handlers import `cloudflare:workers` and use extensionless relative imports (bundler resolution).
// This loader maps the former to an in-memory D1 stub and resolves the latter for plain node.
register("./resolve-hooks.mjs", import.meta.url);
