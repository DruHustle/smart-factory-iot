export function demoDataEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_DEMO_DATA === "true";
}

export function visibleWhenDemoDataEnabled(record: { isDemo: boolean }, env: NodeJS.ProcessEnv = process.env): boolean {
  return !record.isDemo || demoDataEnabled(env);
}
