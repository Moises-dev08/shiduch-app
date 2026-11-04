let nextChannelId = 0;

/**
 * Supabase reuses a channel when the topic matches and throws if
 * `postgres_changes` listeners are added after `subscribe()`.
 * A new topic keeps every effect run on a channel that has not joined yet.
 */
export function uniqueRealtimeTopic(base: string): string {
  nextChannelId += 1;
  return `${base}:${nextChannelId}`;
}
