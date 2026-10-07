let runtimeEnabled: boolean | undefined;

export function demoDataEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return runtimeEnabled ?? env.ENABLE_DEMO_DATA === "true";
}

export function setRuntimeDemoDataEnabled(enabled: boolean | undefined) {
  runtimeEnabled = enabled;
}

export function visibleWhenDemoDataEnabled(record: { isDemo: boolean }, env: NodeJS.ProcessEnv = process.env): boolean {
  return !record.isDemo || demoDataEnabled(env);
}
