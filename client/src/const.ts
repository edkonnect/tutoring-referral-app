export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();

  if (!oauthPortalUrl || !appId) {
    console.warn(
      "[Auth] Missing VITE_OAUTH_PORTAL_URL or VITE_APP_ID; admin SSO login is unavailable."
    );
    return null;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL("app-auth", `${oauthPortalUrl}/`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.error("[Auth] Invalid VITE_OAUTH_PORTAL_URL:", oauthPortalUrl, error);
    return null;
  }
};
