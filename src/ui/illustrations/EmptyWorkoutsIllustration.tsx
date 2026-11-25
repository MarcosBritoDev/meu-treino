import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Line, G } from 'react-native-svg';
import { colors } from '../../theme';

interface EmptyWorkoutsIllustrationProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Ilustração vetorial acolhedora da pasta de treinos vazia (Etapa 3.2):
 * Pasta de planejamento, detalhes técnicos e halteres em tom coral.
 */
export const EmptyWorkoutsIllustration: React.FC<EmptyWorkoutsIllustrationProps> = ({
  size = 144,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Halo de iluminação ambiente suave */}
      <View style={[styles.halo, { width: size * 0.9, height: size * 0.9 }]} />

      <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
        {/* Base circular escura */}
        <Circle cx="80" cy="80" fill="#241F18" r="54" />

        {/* Silhueta da aba traseira da pasta */}
        <Path
          d="M42 54C42 50.6863 44.6863 48 48 48H66L72 54H114C117.314 54 120 56.6863 120 60V66H42V54Z"
          fill="#3A342C"
        />

        {/* Ficha / folha de plano interno */}
        <Rect
          x="52"
          y="44"
          width="56"
          height="36"
          rx="6"
          fill="#18120C"
          stroke="#58423C"
          strokeDasharray="3 3"
          strokeWidth="2"
        />

        {/* Corpo principal da pasta */}
        <Rect
          x="36"
          y="62"
          width="88"
          height="60"
          rx="10"
          fill="#2F2922"
          stroke="#58423C"
          strokeWidth="2"
        />

        {/* Recorte superior da pasta */}
        <Path
          d="M44 76C44 73.7909 45.7909 72 48 72H112C114.209 72 116 73.7909 116 76"
          stroke="#3A342C"
          strokeLinecap="round"
          strokeWidth="2"
        />

        {/* Halteres flutuantes em tom coral/âmbar */}
        <G transform="translate(62, 78)">
          {/* Anilha esquerda */}
          <Rect x="0" y="4" width="4" height="18" rx="2" fill={colors.primary} />
          <Rect x="6" y="7" width="3" height="12" rx="1.5" fill="#FFB4A2" />

          {/* Barra central */}
          <Rect x="8" y="11" width="20" height="4" rx="2" fill="#CFC5BA" />

          {/* Ranhuras de pegada */}
          <Line x1="16" y1="11" x2="16" y2="15" stroke="#18120C" strokeWidth="1.5" />
          <Line x1="20" y1="11" x2="20" y2="15" stroke="#18120C" strokeWidth="1.5" />

          {/* Anilha direita */}
          <Rect x="27" y="7" width="3" height="12" rx="1.5" fill="#FFB4A2" />
          <Rect x="32" y="4" width="4" height="18" rx="2" fill={colors.primary} />
        </G>

        {/* Pequenas centelhas e estrelas de energia */}
        <Path
          d="M122 42L124 47L129 49L124 51L122 56L120 51L115 49L120 47L122 42Z"
          fill={colors.primary}
        />
        <Circle cx="34" cy="50" r="3" fill="#F6BC64" />
        <Circle cx="126" cy="104" r="2.5" fill="#CFC5BA" opacity={0.6} />
        <Path
          d="M38 108L39 111L42 112L39 113L38 116L37 113L34 112L37 111L38 108Z"
          fill="#FFB4A2"
          opacity={0.75}
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
    backgroundColor: 'rgba(255, 122, 89, 0.08)',
  },
});
