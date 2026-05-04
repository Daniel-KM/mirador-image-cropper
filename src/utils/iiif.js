export function getImageService(canvas) {
  if (!canvas) return null;
  const items = canvas.items || canvas.images;
  if (!items || !items.length) return null;
  const annoPage = items[0].items || [items[0]];
  const anno = annoPage[0] || items[0];
  const body = anno.body || anno.resource;
  if (!body) return null;
  const services = body.service || (body.default && body.default.service);
  if (!services) return null;
  const svc = Array.isArray(services) ? services[0] : services;
  return svc;
}

export function getImageBaseUrl(service) {
  if (!service) return null;
  return service.id || service['@id'] || null;
}

export function getImageApiVersion(service) {
  if (!service) return '2';
  const ctx = service['@context'];
  if (!ctx) return service.type === 'ImageService3' ? '3' : '2';
  const ctxStr = Array.isArray(ctx) ? ctx.join(' ') : ctx;
  if (ctxStr.includes('iiif.io/api/image/3')) return '3';
  return '2';
}

export function defaultQuality(service) {
  return getImageApiVersion(service) === '2' ? 'default' : 'default';
}

export function buildIiifUrl({
  baseUrl,
  region,
  size = 'full',
  rotation = 0,
  quality = 'default',
  format = 'jpg',
}) {
  if (!baseUrl) return '';
  const regionStr = region
    ? `pct:${region.x},${region.y},${region.w},${region.h}`
    : 'full';
  return `${baseUrl}/${regionStr}/${size}/${rotation}/${quality}.${format}`;
}

export function pixelDimensions(canvas, regionPct) {
  const w = canvas?.width || 0;
  const h = canvas?.height || 0;
  if (!regionPct) return { w: 0, h: 0 };
  return {
    w: Math.round((regionPct.w / 100) * w),
    h: Math.round((regionPct.h / 100) * h),
  };
}
