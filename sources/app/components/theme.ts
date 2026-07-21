export const Theme = {
    /* ---- Dark paper-inspired backdrop ---- */
    background: '#1a1a2e',
    surface: '#222240',
    surfaceAlt: '#2a2a48',

    /* ---- Pencil ink for text ---- */
    text: '#ebeae6',
    textSoft: '#9d9bb8',
    textMuted: '#6b6988',

    /* ---- Vibran accents — glasses AI lens colors ---- */
    accent: '#6C63FF',       // Left lens purple
    accentRight: '#3F8CFF',  // Right lens blue
    accentGlow: 'rgba(108, 99, 255, 0.18)',
    secondary: '#FF6B6B',

    /* ---- Status ---- */
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',

    /* ---- Borders ---- */
    border: '#333355',
    borderBright: '#4a4a7a',

    /* ---- Shadows (React Native Web: shadowColor/Offset/Opacity/Radius) ---- */
    shadowCard: {
        shadowColor: '#6C63FF',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 0,
    } as const,
    shadowHard: {
        shadowColor: 'rgba(255,255,255,0.05)',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    } as const,

    /* ---- Radii ---- */
    radiusSm: 10,
    radiusMd: 14,
    radiusLg: 20,
    radiusXl: 28,
    radiusPill: 9999,
};

export const ThemeApp = {
    button: {
        text: '#ffffff',
        bg: Theme.accent,
        bgPressed: '#5a52e0',
        border: Theme.accent,
    },
    buttonOutline: {
        text: Theme.accent,
        bg: 'transparent',
        bgPressed: 'rgba(108,99,255,0.10)',
        border: Theme.accent,
    },
    buttonGhost: {
        text: Theme.textSoft,
        bg: 'transparent',
        bgPressed: 'rgba(255,255,255,0.05)',
        border: 'transparent',
    },
    input: {
        text: Theme.text,
        bg: Theme.surfaceAlt,
        placeholder: Theme.textMuted,
        border: Theme.borderBright,
    },
    card: {
        bg: Theme.surfaceAlt,
        border: Theme.border,
        shadow: Theme.shadowCard,
        radius: Theme.radiusXl,
    },
    tag: {
        bg: Theme.surface,
        text: Theme.accent,
    },
};