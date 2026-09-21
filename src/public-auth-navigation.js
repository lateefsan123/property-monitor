// Checkout intent must survive OAuth; it must not decide which public page opens.
export function isPublicAuthLocation(location) {
  return location.hash === "#login";
}

export function publicAuthUrl(href, showAuth) {
  const url = new URL(href);
  url.hash = showAuth ? "login" : "";
  return `${url.pathname}${url.search}${url.hash}`;
}
