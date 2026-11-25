import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, G, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';

interface EmptyHomeIllustrationProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Ilustração vetorial minimalista para a tela de Início sem treino (Estado 4.2):
 * Calendário com halter em repouso e raio de energia característico do Volt Precision.
 */
export const EmptyHomeIllustration: React.FC<EmptyHomeIllustrationProps> = ({
  size = 144,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Halo de iluminação ambiente suave */}
      <View style={[styles.halo, { width: size * 0.9, height: size * 0.9 }]} />

      <Svg width={size} height={size} viewBox="0 0 144 144" fill="none">
        {/* Placa traseira do calendário */}
        <Rect x="26" y="24" width="92" height="96" rx="20" fill="#241F18" />
        <Rect x="26" y="24" width="92" height="32" rx="20" fill="#2F2922" />
        <Rect x="26" y="44" width="92" height="12" fill="#2F2922" />

        {/* Anéis de suspensão do calendário */}
        <Rect x="44" y="16" width="6" height="16" rx="3" fill="#FFB4A2" />
        <Rect x="94" y="16" width="6" height="16" rx="3" fill="#FFB4A2" />

        {/* Silhueta do halter em descanso */}
        <G opacity={0.95}>
          {/* Anilha esquerda */}
          <Rect x="46" y="68" width="6" height="26" rx="3" fill="#3A342C" />
          <Rect x="53" y="73" width="4" height="16" rx="2" fill="#58423C" />
          {/* Barra central */}
          <Rect x="56" y="79" width="32" height="4" rx="2" fill="#CFC5BA" />
          {/* Anilha direita */}
          <Rect x="87" y="73" width="4" height="16" rx="2" fill="#58423C" />
          <Rect x="92" y="68" width="6" height="26" rx="3" fill="#3A342C" />
        </G>

        {/* Raio Volt Coral característico */}
        <Path
          d="M74.5 48L68 62H75L71.5 76L82 60H75.5L78.5 48H74.5Z"
          fill="#FF7A59"
        />

        {/* Indicadores de dias em descanso */}
        <Circle cx="50" cy="104" r="2.5" fill="#3A342C" />
        <Circle cx="64" cy="104" r="2.5" fill="#3A342C" />
        <Circle cx="78" cy="104" r="2.5" fill="#FF7A59" fillOpacity={0.6} />
        <Circle cx="92" cy="104" r="2.5" fill="#3A342C" />
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
    borderRadius: 999,
    backgroundColor: 'rgba(255, 122, 89, 0.08)',
  },
});
