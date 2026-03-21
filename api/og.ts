import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");

  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#020208"/>
  <defs>
    <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0L0 0 0 40" fill="none" stroke="#0a0a2a" stroke-width=".5"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#g)" opacity=".3"/>
  <circle cx="150" cy="80" r="250" fill="#00f0f0" opacity=".04"/>
  <circle cx="1050" cy="550" r="200" fill="#ff00aa" opacity=".03"/>
  <g opacity=".5" transform="translate(80,300)">
    <rect width="44" height="44" rx="4" fill="#00f0f0"/>
    <rect x="44" width="44" height="44" rx="4" fill="#00f0f0"/>
    <rect x="88" width="44" height="44" rx="4" fill="#00f0f0"/>
    <rect x="132" width="44" height="44" rx="4" fill="#00f0f0"/>
  </g>
  <g opacity=".4" transform="translate(920,220)">
    <rect width="44" height="44" rx="4" fill="#a000f0"/>
    <rect x="44" width="44" height="44" rx="4" fill="#a000f0"/>
    <rect x="44" y="44" width="44" height="44" rx="4" fill="#a000f0"/>
    <rect x="88" y="44" width="44" height="44" rx="4" fill="#a000f0"/>
  </g>
  <g opacity=".35" transform="translate(980,420)">
    <rect width="44" height="44" rx="4" fill="#f0f000"/>
    <rect x="44" width="44" height="44" rx="4" fill="#f0f000"/>
    <rect y="44" width="44" height="44" rx="4" fill="#f0f000"/>
    <rect x="44" y="44" width="44" height="44" rx="4" fill="#f0f000"/>
  </g>
  <text x="600" y="240" text-anchor="middle" fill="#00f0f0" font-family="'Courier New',monospace" font-size="100" font-weight="bold" letter-spacing="12">DROPSTER</text>
  <text x="600" y="300" text-anchor="middle" fill="#4a4a6a" font-family="'Courier New',monospace" font-size="24" letter-spacing="10">BLOCK BATTLE ARENA</text>
  <rect x="440" y="380" width="320" height="50" rx="6" fill="none" stroke="#00f0f0" stroke-width="1" opacity=".3"/>
  <text x="600" y="414" text-anchor="middle" fill="#00f0f0" font-family="'Courier New',monospace" font-size="18" letter-spacing="6" opacity=".8">PLAY FREE</text>
  <text x="600" y="560" text-anchor="middle" fill="#333" font-family="'Courier New',monospace" font-size="16">1v1 Competitive Tetris — No Download</text>
</svg>`);
}
