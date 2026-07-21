import * as React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Theme, ThemeApp } from './theme';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'lg' | 'md' | 'sm';

const sizeMap: Record<ButtonSize, { height: number; fontSize: number; padH: number; radius: number }> = {
    lg: { height: 52, fontSize: 18, padH: 28, radius: 26 },
    md: { height: 42, fontSize: 15, padH: 20, radius: 21 },
    sm: { height: 34, fontSize: 13, padH: 16, radius: 17 },
};

const variantMap: Record<ButtonVariant, { bg: string; bgPressed: string; text: string; border: string }> = {
    primary: { bg: Theme.accent, bgPressed: '#5a52e0', text: '#fff', border: Theme.accent },
    outline: { bg: 'transparent', bgPressed: 'rgba(108,99,255,0.08)', text: Theme.accent, border: Theme.accent },
    ghost: { bg: 'transparent', bgPressed: 'rgba(255,255,255,0.04)', text: Theme.textSoft, border: 'transparent' },
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
    const variant = variantMap[props.variant ?? 'primary'];
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
                    height: s.height,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: s.padH,
                    borderRadius: s.radius,
                    borderWidth: variant.border === 'transparent' ? 0 : 2,
                    backgroundColor: p.pressed ? variant.bgPressed : variant.bg,
                    borderColor: variant.border,
                    opacity: props.disabled ? 0.45 : 1,
                    boxShadow:
                        props.variant === 'outline' || props.variant === 'ghost'
                            ? undefined
                            : Theme.shadowHard,
                },
                { transform: p.pressed ? [{ translateX: 2 }, { translateY: 2 }] : undefined },
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
            {!!props.title && !loading && (
                <Text
                    numberOfLines={1}
                    style={{
                        color: variant.text,
                        fontSize: s.fontSize,
                        fontWeight: '700',
                        letterSpacing: -0.2,
                        includeFontPadding: false,
                    }}
                >
                    {props.title}
                </Text>
            )}
            {!!props.title && loading && (
                <Text
                    numberOfLines={1}
                    style={{
                        color: variant.text,
                        fontSize: s.fontSize,
                        fontWeight: '700',
                        opacity: 0.6,
                        includeFontPadding: false,
                    }}
                >
                    {props.title}
                </Text>
            )}
        </Pressable>
    );
});