const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export const shouldRecordAnalytics = (
  hostname = typeof window !== 'undefined' ? window.location.hostname : '',
) => !LOCAL_HOSTNAMES.has(hostname.toLowerCase());
