/* ================================================================
   OpenGlass — Hand-Drawn Boutique Aesthetic
   Inspired by LooksMax AI design system:
     • Warm paper background w/ dot texture
     • Pencil-black borders (2px solid)
     • Hard offset shadows (no blur, solid)
     • Red marker accent (#ff4d4d)
     • Post-it yellow CTAs
     • Dashed borders for secondary
     • Wobbly radii, slight card tilts
     • Eyebrow labels, scribble underlines
   ================================================================ */

export const Theme = {
    /* Background scale — warm paper */
    background: '#fdfbf7',
    surface: '#ffffff',
    surfaceAged: '#f5efe2',
    surfaceDark: '#e9e0cf',

    /* Pencil ink for text */
    text: '#2d2d2d',
    textSoft: '#4a4a4a',
    textMuted: '#6b6b6b',

    /* Marker red — single vibrant accent (no purple/blue/gradients) */
    accent: '#ff4d4d',
    accentDeep: '#e53838',

    /* Post-it yellow — CTAs + highlights */
    postit: '#fff9c4',
    postitDeep: '#fde68a',

    /* Ballpoint blue — input focus rings only */
    ballpoint: '#2d5da1',

    /* Status */
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',

    /* Borders */
    border: '#2d2d2d',
    borderSoft: '#4a4a4a',

    /* Hard offset shadow — solid, no blur (React Native Web compatible) */
    shadowSm: 3 as const,
    shadowMd: 5 as const,
    shadowLg: 8 as const,

    /* Radii (React Native Web only takes single number) */
    radiusSm: 14,
    radiusMd: 20,
    radiusLg: 28,
    radiusXl: 38,
    radiusPill: 9999,
    radiusInput: 14,
    radiusButton: 16,
    radiusCard: 22,
    radiusImage: 16,

    /* Font families */
    fontDisplay: '"Kalam", "PatrickHand", cursive, system-ui, sans-serif',
    fontBody: '"PatrickHand", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", monospace',
};