import Constants from 'expo-constants';

/**
 * Resolve the Anthropic API key from app config (expo-constants extra) with a
 * process.env fallback. Single source of truth for every screen that calls
 * the Claude API — returns undefined when no key is configured.
 */
export function getAnthropicApiKey(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined) ??
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY
  );
}
