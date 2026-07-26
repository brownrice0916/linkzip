import React from 'react';

interface MapIllustrationProps {
  className?: string;
}

export const MapIllustration: React.FC<MapIllustrationProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 640 360" role="img" aria-label="지도 일러스트" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="map-ground" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f3f0e8" />
        <stop offset="1" stopColor="#e8eee7" />
      </linearGradient>
      <linearGradient id="map-water" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#b9dded" />
        <stop offset="1" stopColor="#91c9df" />
      </linearGradient>
      <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="7" stdDeviation="7" floodOpacity="0.22" />
      </filter>
    </defs>
    <rect width="640" height="360" fill="url(#map-ground)" />
    <path d="M-30 272C96 208 188 318 305 249C423 180 514 250 680 153V390H-30Z" fill="url(#map-water)" opacity="0.9" />
    <g fill="#d8e6d3" stroke="#c7d9c2" strokeWidth="2">
      <path d="M30 30h126v74H30z" /><path d="M201 18h103v91H201z" /><path d="M355 32h116v69H355z" /><path d="M517 19h92v105H517z" />
      <path d="M41 146h90v70H41z" /><path d="M175 139h121v75H175z" /><path d="M472 143h131v63H472z" />
    </g>
    <g fill="none" stroke="#fff" strokeLinecap="round">
      <path d="M-10 126C122 99 210 130 325 114C443 98 520 77 660 101" strokeWidth="19" />
      <path d="M154 -20C173 74 146 157 167 239C180 290 231 321 252 380" strokeWidth="15" />
      <path d="M421 -20C398 82 432 155 405 222C384 274 335 306 322 380" strokeWidth="13" />
      <path d="M-20 230C112 242 193 229 290 207C395 184 489 202 660 175" strokeWidth="11" />
    </g>
    <g fill="none" stroke="#d1d5db" strokeLinecap="round" strokeDasharray="5 8">
      <path d="M-10 126C122 99 210 130 325 114C443 98 520 77 660 101" strokeWidth="2" />
      <path d="M154 -20C173 74 146 157 167 239C180 290 231 321 252 380" strokeWidth="2" />
      <path d="M421 -20C398 82 432 155 405 222C384 274 335 306 322 380" strokeWidth="2" />
    </g>
    <g transform="translate(320 151)" filter="url(#pin-shadow)">
      <path d="M0-58c-31 0-56 24-56 54c0 41 56 91 56 91S56 37 56-4c0-30-25-54-56-54Z" fill="#111827" />
      <circle cy="-5" r="19" fill="#fff" />
      <circle cy="-5" r="8" fill="#f43f5e" />
    </g>
    <g fill="#6b7280" fontFamily="sans-serif" fontSize="13" fontWeight="700" opacity="0.65">
      <text x="56" y="76">PARK</text><text x="520" y="72">CITY</text><text x="63" y="183">STREET</text>
    </g>
  </svg>
);
