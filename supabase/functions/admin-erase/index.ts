// Network wiring only; the logic lives in handler.ts. verify_jwt = true (supabase/config.toml).
import { fail } from '../_shared/http.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';
import { handle } from './handler.ts';
import { callEraseRpc, removeObjects } from './lib/db.ts';

Deno.serve(async (req) => {
  try {
    return await handle(req, {
      verifyUser: async (jwt) => {
        const { data, error } = await createUserClient(jwt).auth.getUser(jwt);
        return error || !data.user ? null : data.user.id;
      },
      eraseRpc: (jwt, requestId) => callEraseRpc(createUserClient(jwt), requestId),
      remove: (bucket, paths) => removeObjects(createAdminClient(), bucket, paths),
      log: (message) => console.error(message),
    });
  } catch {
    return fail('internal');
  }
});
