import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors } from '../../theme';

interface EmptySearchIllustrationProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Ilustração fiel de busca vazia da Etapa 2.2:
 * Lupa com ponto de interrogação em tom coral/âmbar, anilhas de fundo e brilhos.
 */
export const EmptySearchIllustration: React.FC<EmptySearchIllustrationProps> = ({
  size = 144,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Halo de fundo suave */}
      <View style={[styles.halo, { width: size * 0.9, height: size * 0.9 }]} />

      <Svg width={size} height={size} viewBox="0 0 144 144" fill="none">
        {/* Círculo externo pontilhado estilo anilha */}
        <Circle
          cx="72"
          cy="72"
          r="58"
          stroke="#241F18"
          strokeDasharray="4 6"
          strokeWidth="8"
        />

        {/* Anel intermediário da anilha */}
        <Circle
          cx="72"
          cy="72"
          opacity={0.6}
          r="42"
          stroke="#2F2922"
          strokeWidth="12"
        />

        {/* Furo central da anilha */}
        <Circle cx="72" cy="72" fill="#18120C" r="16" />

        {/* Barra e presilhas */}
        <Path
          d="M48 72H96"
          stroke="#3A342C"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <Circle cx="48" cy="72" fill="#3A342C" r="7" />
        <Circle cx="96" cy="72" fill="#3A342C" r="7" />

        {/* Lupa com ponto de interrogação */}
        <G>
          <Circle
            cx="68"
            cy="64"
            fill="#241F18"
            fillOpacity={0.9}
            r="26"
            stroke={colors.primary}
            strokeLinecap="round"
            strokeWidth="4"
          />
          <Path
            d="M86 82L108 104"
            stroke={colors.primary}
            strokeLinecap="round"
            strokeWidth="4.5"
          />
          {/* Ponto de interrogação em âmbar exclusivo */}
          <Path
            d="M68 53C66 53 63.5 54.5 63.5 57.5C63.5 61 68 60.5 68 64.5"
            stroke={colors.pr}
            strokeLinecap="round"
            strokeWidth="3"
          />
          <Circle cx="68" cy="71" fill={colors.pr} r="1.75" />
        </G>

        {/* Brilhos / sparkles em tom coral */}
        <Path
          d="M102 40L103.5 35L108.5 33.5L103.5 32L102 27L100.5 32L95.5 33.5L100.5 35L102 40Z"
          fill={colors.onPrimaryContainer}
          opacity={0.85}
        />
        <Path
          d="M38 98L39 94L43 93L39 92L38 88L37 92L33 93L37 94L38 98Z"
          fill={colors.primary}
          opacity={0.6}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainerLow,
    opacity: 0.6,
  },
});
