import React from 'react';
import Svg, { Circle, Rect, Path, G } from 'react-native-svg';
import { normalizeMuscleName, Muscle } from '../domain/exerciseCatalog';

export interface MuscleIconProps {
  muscle: string;
  active?: boolean;
  muted?: boolean;
  size?: number;
}

/**
 * MuscleIcon — Componente vetorial leve representando os 20 músculos do catálogo
 * 
 * Exibe uma mini-silhueta discreta com o grupo muscular alvo destacado.
 * - Silhueta base: #5C544C (ou rgba(26,23,21,0.28) quando active)
 * - Músculo alvo: #FF7A59 (ou #1A1715 quando active, e #7D746B quando muted)
 */
export const MuscleIcon: React.FC<MuscleIconProps> = ({
  muscle,
  active = false,
  muted = false,
  size = 28,
}) => {
  const normMuscle = normalizeMuscleName(muscle);

  const baseColor = active ? 'rgba(26, 23, 21, 0.28)' : '#5C544C';
  const highlightColor = muted ? '#7D746B' : active ? '#1A1715' : '#FF7A59';

  const getColor = (isHighlighted: boolean) => (isHighlighted ? highlightColor : baseColor);

  // Músculos observados melhor pela vista posterior (Costas)
  const isPosterior =
    normMuscle === 'Ombro posterior' ||
    normMuscle === 'Tríceps' ||
    normMuscle === 'Dorsais' ||
    normMuscle === 'Costas superiores' ||
    normMuscle === 'Lombar' ||
    normMuscle === 'Pescoço / Trapézio' ||
    normMuscle === 'Glúteos' ||
    normMuscle === 'Posterior de coxa' ||
    normMuscle === 'Panturrilha';

  const isFullBody = normMuscle === 'Corpo inteiro';

  if (isPosterior) {
    const isTraps = isFullBody || normMuscle === 'Pescoço / Trapézio';
    const isUpperBack = isFullBody || normMuscle === 'Costas superiores';
    const isRearDelts = isFullBody || normMuscle === 'Ombro posterior';
    const isTriceps = isFullBody || normMuscle === 'Tríceps';
    const isForearms = isFullBody;
    const isLats = isFullBody || normMuscle === 'Dorsais';
    const isLowerBack = isFullBody || normMuscle === 'Lombar';
    const isGlutes = isFullBody || normMuscle === 'Glúteos';
    const isHamstrings = isFullBody || normMuscle === 'Posterior de coxa';
    const isCalves = isFullBody || normMuscle === 'Panturrilha';

    return (
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* Cabeça */}
        <Circle cx="16" cy="4" r="2.5" fill={getColor(isFullBody)} />

        {/* Trapézio / Pescoço */}
        <Path
          d="M 16 6.8 L 19.8 9 L 18.2 11.2 L 13.8 11.2 L 12.2 9 Z"
          fill={getColor(isTraps)}
        />

        {/* Costas superiores (romboides e escápulas) */}
        <Path
          d="M 13.6 11.6 L 18.4 11.6 L 17.6 14.8 L 14.4 14.8 Z"
          fill={getColor(isUpperBack)}
        />

        {/* Ombro posterior */}
        <Rect x="7.4" y="8.8" width="2.2" height="3.2" rx="1.1" fill={getColor(isRearDelts)} />
        <Rect x="22.4" y="8.8" width="2.2" height="3.2" rx="1.1" fill={getColor(isRearDelts)} />

        {/* Tríceps */}
        <Rect x="7.4" y="12.4" width="2.2" height="4" rx="1.1" fill={getColor(isTriceps)} />
        <Rect x="22.4" y="12.4" width="2.2" height="4" rx="1.1" fill={getColor(isTriceps)} />

        {/* Antebraço posterior */}
        <Rect x="6.6" y="16.8" width="2.2" height="4.6" rx="1.1" fill={getColor(isForearms)} />
        <Rect x="23.2" y="16.8" width="2.2" height="4.6" rx="1.1" fill={getColor(isForearms)} />

        {/* Dorsais (asas) */}
        <Path d="M 10.6 11.8 L 13.6 12.2 L 13.2 16.8 L 11.4 16.8 Z" fill={getColor(isLats)} />
        <Path d="M 21.4 11.8 L 18.4 12.2 L 18.8 16.8 L 20.6 16.8 Z" fill={getColor(isLats)} />

        {/* Lombar */}
        <Rect x="13.6" y="15.2" width="4.8" height="3.4" rx="1.2" fill={getColor(isLowerBack)} />

        {/* Glúteos */}
        <Rect x="11.2" y="19" width="4.5" height="4" rx="1.8" fill={getColor(isGlutes)} />
        <Rect x="16.3" y="19" width="4.5" height="4" rx="1.8" fill={getColor(isGlutes)} />

        {/* Posterior de coxa */}
        <Rect x="11.4" y="23.4" width="3.8" height="4.2" rx="1.4" fill={getColor(isHamstrings)} />
        <Rect x="16.8" y="23.4" width="3.8" height="4.2" rx="1.4" fill={getColor(isHamstrings)} />

        {/* Panturrilha */}
        <Rect x="11.4" y="28" width="3.4" height="3.6" rx="1.4" fill={getColor(isCalves)} />
        <Rect x="17.2" y="28" width="3.4" height="3.6" rx="1.4" fill={getColor(isCalves)} />
      </Svg>
    );
  }

  // Vista anterior (Frente)
  const isChest = isFullBody || normMuscle === 'Peito';
  const isFrontDelts = isFullBody || normMuscle === 'Ombro anterior';
  const isSideDelts = isFullBody || normMuscle === 'Ombro lateral';
  const isBiceps = isFullBody || normMuscle === 'Bíceps';
  const isForearms = isFullBody || normMuscle === 'Antebraço';
  const isAbs = isFullBody || normMuscle === 'Abdômen';
  const isQuads = isFullBody || normMuscle === 'Quadríceps';
  const isAdductors = isFullBody || normMuscle === 'Adutores';
  const isAbductors = isFullBody || normMuscle === 'Abdutores';
  const isOther = normMuscle === 'Outro';

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cabeça */}
      <Circle cx="16" cy="4" r="2.5" fill={getColor(isFullBody)} />

      {/* Pescoço */}
      <Rect x="14.8" y="6.6" width="2.4" height="1.6" rx="0.8" fill={getColor(isFullBody)} />

      {/* Ombro lateral */}
      <Rect x="6.8" y="9.2" width="1.8" height="3.2" rx="0.9" fill={getColor(isSideDelts)} />
      <Rect x="23.4" y="9.2" width="1.8" height="3.2" rx="0.9" fill={getColor(isSideDelts)} />

      {/* Ombro anterior */}
      <Rect x="9" y="8.8" width="1.8" height="3.2" rx="0.9" fill={getColor(isFrontDelts)} />
      <Rect x="21.2" y="8.8" width="1.8" height="3.2" rx="0.9" fill={getColor(isFrontDelts)} />

      {/* Peito */}
      <Rect x="11.2" y="8.8" width="4.4" height="4.2" rx="1.4" fill={getColor(isChest)} />
      <Rect x="16.4" y="8.8" width="4.4" height="4.2" rx="1.4" fill={getColor(isChest)} />

      {/* Bíceps */}
      <Rect x="7.4" y="12.6" width="2.4" height="3.8" rx="1.2" fill={getColor(isBiceps)} />
      <Rect x="22.2" y="12.6" width="2.4" height="3.8" rx="1.2" fill={getColor(isBiceps)} />

      {/* Antebraço */}
      <Rect x="6.6" y="16.8" width="2.2" height="4.6" rx="1.1" fill={getColor(isForearms)} />
      <Rect x="23.2" y="16.8" width="2.2" height="4.6" rx="1.1" fill={getColor(isForearms)} />

      {/* Abdômen */}
      <Rect x="13.2" y="13.4" width="5.6" height="5.2" rx="1.2" fill={getColor(isAbs)} />

      {/* Abdutores (quadril externo) */}
      <Rect x="9.2" y="19.2" width="1.8" height="4.8" rx="0.9" fill={getColor(isAbductors)} />
      <Rect x="21" y="19.2" width="1.8" height="4.8" rx="0.9" fill={getColor(isAbductors)} />

      {/* Quadríceps */}
      <Rect x="11.4" y="19.5" width="2.6" height="5.2" rx="1.3" fill={getColor(isQuads)} />
      <Rect x="18" y="19.5" width="2.6" height="5.2" rx="1.3" fill={getColor(isQuads)} />

      {/* Adutores (coxa interna) */}
      <Rect x="14.2" y="20.4" width="1.6" height="4.2" rx="0.8" fill={getColor(isAdductors)} />
      <Rect x="16.2" y="20.4" width="1.6" height="4.2" rx="0.8" fill={getColor(isAdductors)} />

      {/* Canela / Panturrilha anterior */}
      <Rect x="11.6" y="25.5" width="2.4" height="5" rx="1.2" fill={getColor(isFullBody)} />
      <Rect x="18" y="25.5" width="2.4" height="5" rx="1.2" fill={getColor(isFullBody)} />

      {/* Ícone sutil para 'Outro' */}
      {isOther && (
        <Path
          d="M 16 13.5 L 17.5 16 L 16 18.5 L 14.5 16 Z"
          fill={highlightColor}
        />
      )}
    </Svg>
  );
};
