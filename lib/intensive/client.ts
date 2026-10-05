export async function intensiveFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401 || input.endsWith("/auth/refresh")) return first;

  const refreshed = await fetch("/api/auth/refresh", {
    method: "POST",
    cache: "no-store",
  });
  if (!refreshed.ok) return first;

  return fetch(input, init);
}
