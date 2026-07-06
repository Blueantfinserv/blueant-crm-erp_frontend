import { colors } from './colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export const theme = {
  colors,
  spacing,
  typography,
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
  },
  shadow: {
    card: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5,
    },
    button: {
      shadowColor: '#2563EB',
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
  },
} as const;
