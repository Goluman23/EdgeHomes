// Inbox provider switch. PROVIDER=easysocial (default) or manychat.
// Both expose: sendTemplate({phone, subscriberId, tpl, vars}), setTags({phone, subscriberId, add, remove}),
//              setField({phone, subscriberId, name, value}).
import * as easysocial from './easysocial.js';
import * as manychat from './manychat.js';
export function provider() {
  return (process.env.PROVIDER || 'easysocial') === 'manychat' ? manychat : easysocial;
}
export { jsonEnv } from './env.js';
