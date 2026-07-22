import * as React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Theme } from './theme';

type ButtonVariant = 'default' | 'marker' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'lg' | 'md' | 'sm' | 'icon';

const sizeMap: Record<ButtonSize, { height: number; fontSize: number; padH: number; radius: number }> = {
    lg: { height: 56, fontSize: 18, padH: 32, radius: Theme.radiusLg },
    md: { height: 48, fontSize: 16, padH: 24, radius: Theme.radiusButton },
    sm: { height: 40, fontSize: 14, padH: 18, radius: Theme.radiusButton },
    icon: { height: 44, fontSize: 14, padH: 0, radius: Theme.radiusSm },
};

const variantMap: Record<ButtonVariant, {
    bg: string;
    bgPressed: string;
    text: string;
    border: string;
    borderWidth: number;
    shadow: boolean;
    dashed: boolean;
}> = {
    default: {
        bg: Theme.postit,
        bgPressed: Theme.postitDeep,
        text: Theme.text,
        border: Theme.text,
        borderWidth: 2,
        shadow: true,   // hard-shadow-sm → pushed down on press
        dashed: false,
    },
    marker: {
        bg: Theme.accent,
        bgPressed: Theme.accentDeep,
        text: '#ffffff',
        border: Theme.text,
        borderWidth: 2,
        shadow: true,
        dashed: false,
    },
    secondary: {
        bg: Theme.surface,
        bgPressed: Theme.surfaceDark,
        text: Theme.text,
        border: Theme.text,
        borderWidth: 2,
        shadow: true,
        dashed: false,
    },
    outline: {
        bg: Theme.surface,
        bgPressed: Theme.postit,
        text: Theme.text,
        border: Theme.text,
        borderWidth: 2,
        shadow: false,
        dashed: true,
    },
    ghost: {
        bg: 'transparent',
        bgPressed: Theme.postit,
        text: Theme.textSoft,
        border: 'transparent',
        borderWidth: 0,
        shadow: false,
        dashed: false,
    },
};

export const RoundButton = React.memo((props: {
    title?: string;
    size?: ButtonSize;
    variant?: ButtonVariant;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    loading?: boolean;
    onPress?: () => void;
    action?: () => Promise<void>;
}) => {
    const [busy, setBusy] = React.useState(false);
    const loading = props.loading ?? busy;
    const variant = variantMap[props.variant ?? 'default'];
    const s = sizeMap[props.size ?? 'lg'];

    const doPress = React.useCallback(() => {
        if (props.onPress) { props.onPress(); return; }
        if (props.action) {
            setBusy(true);
            props.action().finally(() => setBusy(false));
        }
    }, [props.onPress, props.action]);

    return (
        <Pressable
            disabled={loading || props.disabled}
            style={(p) => [
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: s.height,
                    minWidth: props.size === 'icon' ? s.height : undefined,
                    paddingHorizontal: props.size === 'icon' ? 0 : s.padH,
                    borderRadius: s.radius,
                    backgroundColor: p.pressed ? variant.bgPressed : variant.bg,
                    borderWidth: variant.borderWidth,
                    borderColor: variant.border,
                    borderStyle: variant.dashed ? 'dashed' : 'solid',
                    opacity: props.disabled ? 0.5 : 1,
                    boxShadow: variant.shadow
                        ? `3px 3px 0 0 ${Theme.text}`
                        : undefined,
                },
                // Press: push down (shadow disappears, element shifts)
                p.pressed && variant.shadow
                    ? { transform: [{ translateX: 3 }, { translateY: 3 }], boxShadow: 'none' }
                    : undefined,
                p.pressed && !variant.shadow
                    ? { opacity: 0.85 }
                    : undefined,
                props.style,
            ]}
            onPress={doPress}
        >
            {loading && (
                <ActivityIndicator
                    color={variant.text}
                    size="small"
                    style={{ marginRight: props.title ? 8 : 0 }}
                />
            )}
            {!!props.title && (
                <Text
                    numberOfLines={1}
                    style={{
                        fontFamily: Theme.fontDisplay,
                        fontWeight: '700',
                        color: variant.text,
                        fontSize: s.fontSize,
                        letterSpacing: -0.2,
                        opacity: loading ? 0.6 : 1,
                        includeFontPadding: false,
                    }}
                >
                    {props.title}
                </Text>
            )}
        </Pressable>
    );
});