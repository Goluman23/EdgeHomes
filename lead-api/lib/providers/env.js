export function jsonEnv(name) {
  try { return JSON.parse(process.env[name] || '{}'); } catch { return {}; }
}
