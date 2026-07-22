import 'react-native';

declare module 'react-native' {
    interface ViewStyle {
        boxShadow?: string;
    }
    interface ImageStyle {
        boxShadow?: string;
    }
    interface TextStyle {
        boxShadow?: string;
    }
}