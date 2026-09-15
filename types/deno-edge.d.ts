// Minimal ambient declarations so supabase/functions/** can be type-checked by
// `npm run lint:edge` (tsc) outside the Deno runtime.
//
// Edge functions live outside the app's tsconfig (which excludes `supabase/`),
// and their imports are remote https:// modules that tsc cannot resolve. That
// combination is why a wrong-arity call like `handleWebhook(supabase, body)`
// shipped to production as a 500 instead of failing a build.

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

// Remote modules are declared as `any` exports: enough to type-check our own
// code (including handler arity and Response types) without fetching Deno
// dependencies. Update the specifiers if a function changes its import URL.
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  const createClient: (...args: any[]) => any
  export { createClient }
}
