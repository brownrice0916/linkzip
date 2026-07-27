const stripAt = (value: string) => value.replace(/^@+/, '');

export const normalizeSocialPlatform = (platform: string) =>
  platform.trim().toLowerCase().replace(/[\s_-]+/g, '');

export const getSocialUrl = (platform: string, rawValue: string) => {
  const value = rawValue.trim();
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPlatform = normalizeSocialPlatform(platform);
  const id = stripAt(value);

  switch (normalizedPlatform) {
    case 'instagram': return `https://instagram.com/${id}`;
    case 'twitter':
    case 'x': return `https://x.com/${id}`;
    case 'youtube': return `https://youtube.com/@${id}`;
    case 'github': return `https://github.com/${id}`;
    case 'linkedin': return `https://linkedin.com/in/${id}`;
    case 'facebook': return `https://facebook.com/${id}`;
    case 'tiktok': return `https://tiktok.com/@${id}`;
    case 'threads': return `https://threads.net/@${id}`;
    case 'naverblog': return `https://blog.naver.com/${id}`;
    case 'postype': return `https://www.postype.com/@${id}`;
    case 'tistory': return `https://${id}.tistory.com`;
    case 'brunch': return `https://brunch.co.kr/@${id}`;
    case 'mail':
    case 'email': return `mailto:${value}`;
    case 'globe':
    case 'link': return `https://${value}`;
    default: return `https://${value}`;
  }
};
