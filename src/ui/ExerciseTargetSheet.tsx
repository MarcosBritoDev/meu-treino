import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  PanResponder,
} from 'react-native';
import { X, Check, Trash2, Clock } from 'lucide-react-native';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from './Text';
import { ConfirmModal } from './ConfirmModal';
import { triggerHaptic } from './haptics';
import { getRepRangeLabel } from '../domain/workouts';

export interface ExerciseTargetSheetProps {
  visible: boolean;
  exerciseName: string;
  initialSets?: number;
  initialRepMin?: number;
  initialRepMax?: number;
  initialRestS?: number;
  onClose: () => void;
  onApply: (targets: {
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
  }) => void;
  onRemove: () => void;
}

const PRESET_REST_CHIPS = [60, 90, 120, 180] as const;

export const ExerciseTargetSheet: React.FC<ExerciseTargetSheetProps> = ({
  visible,
  exerciseName,
  initialSets = 4,
  initialRepMin = 8,
  initialRepMax = 10,
  initialRestS = 90,
  onClose,
  onApply,
  onRemove,
}) => {
  const [sets, setSets] = useState<number>(initialSets);
  const [repMin, setRepMin] = useState<number>(initialRepMin);
  const [repMax, setRepMax] = useState<number>(initialRepMax);
  const [restS, setRestS] = useState<number>(initialRestS);

  // Modo de descanso customizado ("Outro")
  const [isCustomRest, setIsCustomRest] = useState<boolean>(false);
  const [customRestText, setCustomRestText] = useState<string>('');

  // Confirmação para remover exercício
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      const s = Math.min(10, Math.max(1, initialSets));
      const min = Math.min(50, Math.max(1, initialRepMin));
      const max = Math.min(50, Math.max(min, initialRepMax));
      const r = Math.min(600, Math.max(15, initialRestS));

      setSets(s);
      setRepMin(min);
      setRepMax(max);
      setRestS(r);

      const isPreset = (PRESET_REST_CHIPS as readonly number[]).includes(r);
      setIsCustomRest(!isPreset);
      setCustomRestText(isPreset ? '' : String(r));
      setConfirmRemoveVisible(false);
    }
  }, [visible, initialSets, initialRepMin, initialRepMax, initialRestS]);

  // PanResponder para fechar por arrasto da alça
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 60) {
        triggerHaptic('light');
        onClose();
      }
    },
  });

  // Ajustes de Séries (1 a 10)
  const handleDecrementSets = () => {
    if (sets > 1) {
      triggerHaptic('selection');
      setSets(sets - 1);
    }
  };

  const handleIncrementSets = () => {
    if (sets < 10) {
      triggerHaptic('selection');
      setSets(sets + 1);
    }
  };

  // Ajustes de Repetições Mínimas (1 a repMax)
  const handleDecrementMin = () => {
    if (repMin > 1) {
      triggerHaptic('selection');
      setRepMin(repMin - 1);
    }
  };

  const handleIncrementMin = () => {
    if (repMin < repMax) {
      triggerHaptic('selection');
      setRepMin(repMin + 1);
    }
  };

  // Ajustes de Repetições Máximas (repMin a 50)
  const handleDecrementMax = () => {
    if (repMax > repMin) {
      triggerHaptic('selection');
      setRepMax(repMax - 1);
    }
  };

  const handleIncrementMax = () => {
    if (repMax < 50) {
      triggerHaptic('selection');
      setRepMax(repMax + 1);
    }
  };

  // Seleção de Descanso
  const handleSelectPresetRest = (sec: number) => {
    triggerHaptic('selection');
    setRestS(sec);
    setIsCustomRest(false);
    setCustomRestText('');
  };

  const handleSelectCustomRest = () => {
    triggerHaptic('selection');
    setIsCustomRest(true);
    if (!customRestText) {
      setCustomRestText(String(restS));
    }
  };

  const handleCustomRestChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomRestText(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(600, Math.max(15, parsed));
      setRestS(clamped);
    }
  };

  // Aplicar metas
  const handleApply = () => {
    triggerHaptic('success');
    let finalRest = restS;
    if (isCustomRest && customRestText) {
      const parsed = parseInt(customRestText, 10);
      if (!isNaN(parsed)) {
        finalRest = Math.min(600, Math.max(15, parsed));
      }
    }
    onApply({
      targetSets: sets,
      repMin,
      repMax,
      restS: finalRest,
    });
  };

  if (!visible) return null;

  const dynamicRepLabel = getRepRangeLabel(repMin, repMax);
  const isCustomRestSelected =
    isCustomRest || !(PRESET_REST_CHIPS as readonly number[]).includes(restS);

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {/* Fundo escuro 65% que fecha ao toque */}
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Fechar configuração de alvo"
          />

          <View style={styles.sheetContainer}>
            {/* Alça de arrastar */}
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Cabeçalho */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <Text
                  variant="headline"
                  style={styles.exerciseTitle}
                  numberOfLines={2}
                >
                  {exerciseName}
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  Configuração de alvo
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <X size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* 1. BLOCO SÉRIES (1 a 10) */}
              <View style={styles.blockSection}>
                <View style={styles.blockLabelRow}>
                  <Text variant="labelSmall" style={styles.blockTitle}>
                    Séries
                  </Text>
                  <Text variant="bodySmall" style={styles.blockDescription}>
                    Total de blocos de trabalho
                  </Text>
                </View>

                <View style={styles.seriesStepperCard}>
                  <Pressable
                    onPress={handleDecrementSets}
                    disabled={sets <= 1}
                    style={[
                      styles.stepperActionBtn,
                      sets <= 1 && styles.stepperActionBtnDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Diminuir séries"
                  >
                    <Text variant="headline" style={styles.stepperActionBtnText}>
                      -
                    </Text>
                  </Pressable>

                  <View style={styles.seriesValueContainer}>
                    <Text variant="displayLarge" style={styles.seriesNumber}>
                      {sets}
                    </Text>
                    <Text variant="bodySmall" style={styles.seriesCaption}>
                      séries alvo
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleIncrementSets}
                    disabled={sets >= 10}
                    style={[
                      styles.stepperActionBtn,
                      sets >= 10 && styles.stepperActionBtnDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar séries"
                  >
                    <Text variant="headline" style={styles.stepperActionBtnText}>
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2. BLOCO FAIXA DE REPETIÇÕES */}
              <View style={styles.blockSection}>
                <View style={styles.blockLabelRow}>
                  <Text variant="labelSmall" style={styles.blockTitle}>
                    Faixa de repetições
                  </Text>
                  <Text variant="bodySmall" style={styles.repDynamicLabel}>
                    {dynamicRepLabel}
                  </Text>
                </View>

                <View style={styles.repsGrid}>
                  {/* Mínimo */}
                  <View style={styles.repBox}>
                    <Text variant="bodySmall" style={styles.repBoxTitle}>
                      Mínimo
                    </Text>
                    <View style={styles.repStepperRow}>
                      <Pressable
                        onPress={handleDecrementMin}
                        disabled={repMin <= 1}
                        style={[
                          styles.repSmallBtn,
                          repMin <= 1 && styles.repSmallBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Diminuir repetições mínimas"
                      >
                        <Text variant="bodyLarge" style={styles.repSmallBtnText}>
                          -
                        </Text>
                      </Pressable>

                      <Text variant="displayMedium" style={styles.repBigNumber}>
                        {repMin}
                      </Text>

                      <Pressable
                        onPress={handleIncrementMin}
                        disabled={repMin >= repMax}
                        style={[
                          styles.repSmallBtn,
                          repMin >= repMax && styles.repSmallBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Aumentar repetições mínimas"
                      >
                        <Text variant="bodyLarge" style={styles.repSmallBtnText}>
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Máximo */}
                  <View style={styles.repBox}>
                    <Text variant="bodySmall" style={styles.repBoxTitle}>
                      Máximo
                    </Text>
                    <View style={styles.repStepperRow}>
                      <Pressable
                        onPress={handleDecrementMax}
                        disabled={repMax <= repMin}
                        style={[
                          styles.repSmallBtn,
                          repMax <= repMin && styles.repSmallBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Diminuir repetições máximas"
                      >
                        <Text variant="bodyLarge" style={styles.repSmallBtnText}>
                          -
                        </Text>
                      </Pressable>

                      <Text variant="displayMedium" style={styles.repBigNumber}>
                        {repMax}
                      </Text>

                      <Pressable
                        onPress={handleIncrementMax}
                        disabled={repMax >= 50}
                        style={[
                          styles.repSmallBtn,
                          repMax >= 50 && styles.repSmallBtnDisabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Aumentar repetições máximas"
                      >
                        <Text variant="bodyLarge" style={styles.repSmallBtnText}>
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. BLOCO DESCANSO ENTRE SÉRIES */}
              <View style={styles.blockSection}>
                <View style={styles.blockLabelRow}>
                  <Text variant="labelSmall" style={styles.blockTitle}>
                    Descanso entre séries
                  </Text>
                  <Text variant="bodySmall" style={styles.blockDescription}>
                    Recuperação recomendada
                  </Text>
                </View>

                {/* Chips de descanso predefinidos + Outro */}
                <View style={styles.restChipsGrid}>
                  {PRESET_REST_CHIPS.map((sec) => {
                    const isSelected = !isCustomRest && restS === sec;
                    return (
                      <Pressable
                        key={sec}
                        onPress={() => handleSelectPresetRest(sec)}
                        style={[
                          styles.restChip,
                          isSelected && styles.restChipSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Descanso de ${sec} segundos`}
                      >
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

                  <Pressable
                    onPress={handleSelectCustomRest}
                    style={[
                      styles.restChip,
                      isCustomRestSelected && styles.restChipSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Definir outro tempo de descanso"
                  >
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.restChipText,
                        isCustomRestSelected && styles.restChipTextSelected,
                      ]}
                    >
                      {isCustomRestSelected && !PRESET_REST_CHIPS.includes(restS as any)
                        ? `${restS} s`
                        : 'Outro'}
                    </Text>
                  </Pressable>
                </View>

                {/* Campo "Outro" para valor livre de 15 a 600 s */}
                {isCustomRest && (
                  <View style={styles.customRestInputBox}>
                    <Clock size={16} color={colors.primary} strokeWidth={2} />
                    <TextInput
                      style={styles.customRestTextInput}
                      value={customRestText}
                      onChangeText={handleCustomRestChange}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="Ex: 45 (15 a 600 s)"
                      placeholderTextColor={colors.textMuted}
                      accessible={true}
                      accessibilityLabel="Tempo de descanso personalizado em segundos"
                    />
                    <Text variant="bodySmall" style={styles.customRestUnit}>
                      segundos
                    </Text>
                  </View>
                )}
              </View>

              {/* 4. RODAPÉ DE AÇÕES */}
              <View style={styles.actionButtonsRow}>
                <Pressable
                  onPress={handleApply}
                  style={({ pressed }) => [
                    styles.applyButton,
                    pressed && styles.applyButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Aplicar metas"
                >
                  <Check size={18} color={colors.onPrimary} strokeWidth={2.4} />
                  <Text variant="bodyMedium" style={styles.applyButtonText}>
                    Aplicar metas
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic('warning');
                    setConfirmRemoveVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && styles.removeButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Remover exercício deste treino"
                >
                  <Trash2 size={16} color={colors.error} strokeWidth={2} />
                  <Text variant="labelSmall" style={styles.removeButtonText}>
                    Remover
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação para Remover */}
      <ConfirmModal
        visible={confirmRemoveVisible}
        title="Remover exercício?"
        description={`Tem certeza que deseja remover "${exerciseName}" deste treino? O exercício continuará disponível na sua biblioteca.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => {
          setConfirmRemoveVisible(false);
          triggerHaptic('medium');
          onRemove();
        }}
        onCancel={() => setConfirmRemoveVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay, // 65% preto
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%', // Não ultrapassa 85% da altura
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  handleArea: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  exerciseTitle: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 20,
    color: colors.onSurface,
    lineHeight: 26,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  blockSection: {
    marginBottom: 18,
  },
  blockLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  blockDescription: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  seriesStepperCard: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperActionBtnDisabled: {
    opacity: 0.3,
  },
  stepperActionBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
  },
  seriesValueContainer: {
    alignItems: 'center',
  },
  seriesNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 34,
    lineHeight: 38,
    color: colors.onSurface,
  },
  seriesCaption: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  repDynamicLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  repsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  repBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  repBoxTitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  repStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  repSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repSmallBtnDisabled: {
    opacity: 0.3,
  },
  repSmallBtnText: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  repBigNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 24,
    color: colors.onSurface,
  },
  restChipsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  restChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  restChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  restChipTextSelected: {
    fontWeight: '700',
    color: colors.onPrimary,
  },
  customRestInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  customRestTextInput: {
    flex: 1,
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  customRestUnit: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  applyButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  removeButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  removeButtonPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
