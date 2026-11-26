import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  X,
  Info,
  Check,
  CheckCircle,
  Trash2,
  Minus,
  Plus,
  Timer,
  Dumbbell,
  ChevronsUpDown,
} from 'lucide-react-native';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { ConfirmModal } from './ConfirmModal';
import { triggerHaptic } from './haptics';

export interface EditSessionExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseName?: string;
  initialTargetSets?: number;
  initialRepMin?: number;
  initialRepMax?: number;
  initialRestS?: number;
  initialIncrement?: number;
  completedSetsCount?: number;
  onSave: (data: {
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
    increment: number;
  }) => void;
  onRemove?: () => void;
}

const REST_PRESETS = [60, 90, 120, 180] as const;
const INCREMENT_OPTIONS = [1, 2, 2.5, 5] as const;

export const EditSessionExerciseSheet: React.FC<EditSessionExerciseSheetProps> = ({
  visible,
  onClose,
  exerciseName,
  initialTargetSets = 3,
  initialRepMin = 8,
  initialRepMax = 12,
  initialRestS = 90,
  initialIncrement = 2.5,
  completedSetsCount = 0,
  onSave,
  onRemove,
}) => {
  const [targetSets, setTargetSets] = useState(initialTargetSets);
  const [repMin, setRepMin] = useState(initialRepMin);
  const [repMax, setRepMax] = useState(initialRepMax);
  const [restS, setRestS] = useState(initialRestS);
  const [increment, setIncrement] = useState(initialIncrement);

  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);

  useEffect(() => {
    setTargetSets(initialTargetSets);
    setRepMin(initialRepMin);
    setRepMax(initialRepMax);
    setRestS(initialRestS);
    setIncrement(initialIncrement);
  }, [
    initialTargetSets,
    initialRepMin,
    initialRepMax,
    initialRestS,
    initialIncrement,
    visible,
  ]);

  // Limite mínimo de séries: não pode ser menor que o total de séries já concluídas
  const minAllowedSets = Math.max(1, completedSetsCount);

  const handleMinusSets = () => {
    if (targetSets > minAllowedSets) {
      triggerHaptic('light');
      setTargetSets((prev) => prev - 1);
    } else {
      triggerHaptic('warning');
    }
  };

  const handlePlusSets = () => {
    if (targetSets < 20) {
      triggerHaptic('light');
      setTargetSets((prev) => prev + 1);
    }
  };

  const handleMinusRepMin = () => {
    if (repMin > 1) {
      triggerHaptic('light');
      setRepMin((prev) => {
        const next = prev - 1;
        if (next > repMax) setRepMax(next);
        return next;
      });
    }
  };

  const handlePlusRepMin = () => {
    if (repMin < 50) {
      triggerHaptic('light');
      setRepMin((prev) => {
        const next = prev + 1;
        if (next > repMax) setRepMax(next);
        return next;
      });
    }
  };

  const handleMinusRepMax = () => {
    if (repMax > repMin) {
      triggerHaptic('light');
      setRepMax((prev) => prev - 1);
    }
  };

  const handlePlusRepMax = () => {
    if (repMax < 50) {
      triggerHaptic('light');
      setRepMax((prev) => prev + 1);
    }
  };

  const handleCycleIncrement = () => {
    triggerHaptic('selection');
    setIncrement((prev) => {
      const idx = INCREMENT_OPTIONS.indexOf(prev as any);
      if (idx === -1 || idx === INCREMENT_OPTIONS.length - 1) {
        return INCREMENT_OPTIONS[0];
      }
      return INCREMENT_OPTIONS[idx + 1];
    });
  };

  const handleSave = () => {
    triggerHaptic('success');
    onSave({
      targetSets,
      repMin: Math.min(repMin, repMax),
      repMax: Math.max(repMin, repMax),
      restS,
      increment,
    });
    onClose();
  };

  const handleConfirmRemove = () => {
    setConfirmRemoveVisible(false);
    onClose();
    onRemove?.();
  };

  const formattedIncrement = String(increment).replace('.', ',');

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={88}>
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Selo: Apenas esta sessão */}
            <View style={styles.tagBadge}>
              <Text variant="labelSmall" style={styles.tagText}>
                Apenas esta sessão
              </Text>
            </View>

            {/* Nome do exercício */}
            <Text variant="headline" style={styles.titleText} numberOfLines={2}>
              {exerciseName || 'Editar exercício'}
            </Text>

            {/* Faixa informativa */}
            <View style={styles.infoRow}>
              <Info size={14} color={colors.primary} strokeWidth={2.2} />
              <Text variant="bodySmall" style={styles.infoText}>
                Alterações não afetam a ficha original
              </Text>
            </View>
          </View>

          {/* Botão fechar (X) */}
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <X size={20} color={colors.onSurfaceVariant} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. QUANTIDADE DE SÉRIES */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="bodyMedium" style={styles.sectionTitle}>
                Quantidade de séries
              </Text>
              <Text variant="labelSmall" style={styles.sectionSubtitle}>
                {completedSetsCount > 0
                  ? `${completedSetsCount} concluída${completedSetsCount > 1 ? 's' : ''}`
                  : 'Séries ativas'}
              </Text>
            </View>

            <View style={styles.stepperContainer}>
              <Pressable
                onPress={handleMinusSets}
                disabled={targetSets <= minAllowedSets}
                style={[
                  styles.stepperButton,
                  targetSets <= minAllowedSets && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Diminuir séries"
              >
                <Minus
                  size={20}
                  color={
                    targetSets <= minAllowedSets
                      ? colors.outline
                      : colors.onSurface
                  }
                  strokeWidth={2.4}
                />
              </Pressable>

              <View style={styles.stepperValueContainer}>
                <Text variant="displayMedium" style={styles.stepperLargeNumber}>
                  {targetSets}
                </Text>
                <Text variant="labelSmall" style={styles.stepperUnitText}>
                  séries
                </Text>
              </View>

              <Pressable
                onPress={handlePlusSets}
                style={styles.stepperButton}
                accessibilityRole="button"
                accessibilityLabel="Aumentar séries"
              >
                <Plus size={20} color={colors.onSurface} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>

          {/* 2. REPETIÇÕES ALVO */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="bodyMedium" style={styles.sectionTitle}>
                Repetições alvo
              </Text>
              <View style={styles.hypertrophyChip}>
                <Text variant="labelSmall" style={styles.hypertrophyChipText}>
                  Faixa de hipertrofia
                </Text>
              </View>
            </View>

            <View style={styles.repsGrid}>
              {/* Card Mínimo */}
              <View style={styles.repBox}>
                <Text variant="labelSmall" style={styles.repBoxLabel}>
                  Mínimo
                </Text>
                <View style={styles.repControlsRow}>
                  <Pressable
                    onPress={handleMinusRepMin}
                    disabled={repMin <= 1}
                    style={[
                      styles.repMiniButton,
                      repMin <= 1 && styles.buttonDisabled,
                    ]}
                  >
                    <Minus
                      size={16}
                      color={repMin <= 1 ? colors.outline : colors.onSurface}
                      strokeWidth={2.2}
                    />
                  </Pressable>
                  <Text variant="headline" style={styles.repValueText}>
                    {repMin}
                  </Text>
                  <Pressable
                    onPress={handlePlusRepMin}
                    style={styles.repMiniButton}
                  >
                    <Plus size={16} color={colors.onSurface} strokeWidth={2.2} />
                  </Pressable>
                </View>
                <Text variant="labelSmall" style={styles.repBoxUnit}>
                  reps
                </Text>
              </View>

              {/* Card Máximo */}
              <View style={styles.repBox}>
                <Text variant="labelSmall" style={styles.repBoxLabel}>
                  Máximo
                </Text>
                <View style={styles.repControlsRow}>
                  <Pressable
                    onPress={handleMinusRepMax}
                    disabled={repMax <= repMin}
                    style={[
                      styles.repMiniButton,
                      repMax <= repMin && styles.buttonDisabled,
                    ]}
                  >
                    <Minus
                      size={16}
                      color={
                        repMax <= repMin ? colors.outline : colors.onSurface
                      }
                      strokeWidth={2.2}
                    />
                  </Pressable>
                  <Text variant="headline" style={styles.repValueText}>
                    {repMax}
                  </Text>
                  <Pressable
                    onPress={handlePlusRepMax}
                    style={styles.repMiniButton}
                  >
                    <Plus size={16} color={colors.onSurface} strokeWidth={2.2} />
                  </Pressable>
                </View>
                <Text variant="labelSmall" style={styles.repBoxUnit}>
                  reps
                </Text>
              </View>
            </View>
          </View>

          {/* 3. TEMPO DE DESCANSO */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.restHeaderLeft}>
                <Timer size={18} color={colors.primary} strokeWidth={2.2} />
                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  Tempo de descanso
                </Text>
              </View>
              <Text variant="labelSmall" style={styles.restAutoBadge}>
                Automático
              </Text>
            </View>

            <View style={styles.restChipsGroup}>
              {REST_PRESETS.map((sec) => {
                const isSelected = restS === sec;
                return (
                  <Pressable
                    key={sec}
                    onPress={() => {
                      triggerHaptic('selection');
                      setRestS(sec);
                    }}
                    style={[
                      styles.restChip,
                      isSelected && styles.restChipSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${sec} segundos`}
                  >
                    {isSelected && (
                      <Check
                        size={15}
                        color={colors.background}
                        strokeWidth={2.6}
                      />
                    )}
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.restChipText,
                        isSelected && styles.restChipTextSelected,
                      ]}
                    >
                      {sec} s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. INCREMENTO PADRÃO */}
          <View style={[styles.sectionCard, styles.incrementCard]}>
            <View style={styles.incrementLeft}>
              <View style={styles.dumbbellBox}>
                <Dumbbell size={20} color={colors.onSurface} strokeWidth={2.2} />
              </View>
              <View style={styles.incrementTextCol}>
                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  Incremento padrão
                </Text>
                <Text variant="labelSmall" style={styles.sectionSubtitle}>
                  Para progressão de sobrecarga
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleCycleIncrement}
              style={styles.incrementButton}
              accessibilityRole="button"
              accessibilityLabel={`Incremento +${formattedIncrement} kg. Toque para alterar`}
            >
              <Text variant="bodyMedium" style={styles.incrementValueHighlight}>
                +{formattedIncrement}
              </Text>
              <Text variant="labelSmall" style={styles.incrementUnitText}>
                kg
              </Text>
              <ChevronsUpDown
                size={16}
                color={colors.outline}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* AÇÕES DE RODAPÉ */}
          <View style={styles.footerActions}>
            {/* Botão Primário: Salvar alterações */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Salvar alterações"
            >
              <CheckCircle
                size={20}
                color={colors.background}
                strokeWidth={2.4}
              />
              <Text variant="bodyLarge" style={styles.saveButtonText}>
                Salvar alterações
              </Text>
            </Pressable>

            {/* Botão Danger: Remover exercício deste treino */}
            {onRemove && (
              <Pressable
                onPress={() => {
                  triggerHaptic('medium');
                  setConfirmRemoveVisible(true);
                }}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Remover exercício deste treino"
              >
                <Trash2 size={18} color={colors.error} strokeWidth={2.2} />
                <Text variant="bodySmall" style={styles.removeButtonText}>
                  Remover exercício deste treino
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>

      {/* CONFIRMAÇÃO DE REMOÇÃO DO EXERCÍCIO DA SESSÃO */}
      <ConfirmModal
        visible={confirmRemoveVisible}
        title="Remover da sessão?"
        description="Este exercício será removido apenas do treino atual. As séries feitas em sessões anteriores permanecem gravadas no seu histórico."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemoveVisible(false)}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  tagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  titleText: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    lineHeight: 28,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  stepperLargeNumber: {
    fontSize: 32,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  stepperUnitText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  hypertrophyChip: {
    backgroundColor: '#4D463E',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  hypertrophyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BEB3A9',
  },
  repsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  repBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  repBoxLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  repControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  repMiniButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repValueText: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  repBoxUnit: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  restHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restAutoBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  restChipsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  restChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  restChipSelected: {
    backgroundColor: colors.primary,
  },
  restChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  restChipTextSelected: {
    color: colors.background,
  },
  incrementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incrementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dumbbellBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementTextCol: {
    flex: 1,
  },
  incrementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  incrementValueHighlight: {
    fontSize: 14,
    fontFamily: fontFamilies.outfitBold,
    color: colors.primary,
  },
  incrementUnitText: {
    fontSize: 13,
    color: colors.onSurface,
  },
  footerActions: {
    marginTop: 8,
    gap: 10,
  },
  saveButton: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.outfitBold,
    color: colors.background,
  },
  removeButton: {
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
