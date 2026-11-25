function getBaseUrl(req) {
  const configured = process.env.PUBLIC_API_URL;
  return (configured || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

// DB path -> full URL for whoever is asking
function toAbsoluteUrl(req, imageUrl) {
  if (!imageUrl) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl; // external URLs untouched
  return `${getBaseUrl(req)}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

// Full URL from a client -> path for the DB
function toStoredPath(imageUrl) {
  try {
    const { pathname } = new URL(imageUrl, 'http://placeholder');
    if (pathname.startsWith('/uploads/products/')) return pathname;
  } catch (e) {}
  return imageUrl;
}

module.exports = { toAbsoluteUrl, toStoredPath };