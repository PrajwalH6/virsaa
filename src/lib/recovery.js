export async function verifyRecovery(auth, href, { signal, timeoutMs = 3000 } = {}) {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const type = url.searchParams.get("type") || fragment.get("type");
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");

  if (url.searchParams.has("error") || url.searchParams.has("error_description")
    || fragment.has("error") || fragment.has("error_description")) {
    throw new Error("The recovery link is invalid or expired. Please request a new one.");
  }
  if (!(tokenHash && type === "recovery") && !code
    && !(type === "recovery" && fragment.has("access_token"))) {
    throw new Error("Open the password recovery link sent to your email.");
  }

  let resolveRecovery;
  const recovery = new Promise((resolve) => { resolveRecovery = resolve; });
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) resolveRecovery(session);
  });
  let timer;
  const unsubscribe = () => subscription.unsubscribe();
  const onAbort = () => {
    unsubscribe();
    resolveRecovery(null);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const { error } = await auth.initialize();
    if (error || signal?.aborted) throw new Error("Recovery initialization failed.");

    if (tokenHash && type === "recovery") {
      const { data, error: verificationError } = await auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (verificationError || !data.session) throw new Error("Recovery verification failed.");
      return data.session;
    }

    // Initialization owns URL exchange and dispatches the event asynchronously.
    const session = await Promise.race([
      recovery,
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
    if (!session) throw new Error("Recovery verification failed.");
    return session;
  } catch {
    throw new Error("The recovery link is invalid or expired. Please request a new one.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    if (!signal?.aborted) unsubscribe();
  }
}
