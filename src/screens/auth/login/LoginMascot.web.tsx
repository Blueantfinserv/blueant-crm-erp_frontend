import { Image, type ImageStyle, type StyleProp } from 'react-native';

export function LoginMascot({ style }: { style: StyleProp<ImageStyle> }) {
  return <Image source={require('../../../../assets/download.webp')} style={style} resizeMode="contain" />;
}
