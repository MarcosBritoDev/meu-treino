import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { X, Info, Check } from 'lucide-react-native';
import { colors, radii } from '../theme';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { Stepper } from './Stepper';
import { Button } from './Button';
import { triggerHaptic } from './haptics';

export interface EditSessionExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseName?: string;
  initialTargetSets?: number;
  initialRepMin?: number;
  initialRepMax?: number;
  initialRestS?: number;
  onSave: (data: {
    targetSets: number;
    repMin: number;
    repMax: number;
    restS: number;
  }) => void;
}

const REST_PRESETS = [45, 60, 90, 120, 180];

export const EditSessionExerciseSheet: React.FC<EditSessionExerciseSheetProps> = ({
  visible,
  onClose,
  exerciseName,
  initialTargetSets = 3,
  initialRepMin = 8,
  initialRepMax = 12,
  initialRestS = 90,
  onSave,
}) => {
  const [targetSets, setTargetSets] = useState(initialTargetSets);
  const [repMin, setRepMin] = useState(initialRepMin);
  const [repMax, setRepMax] = useState(initialRepMax);
  const [restS, setRestS] = useState(initialRestS);

  useEffect(() => {
    setTargetSets(initialTargetSets);
    setRepMin(initialRepMin);
    setRepMax(initialRepMax);
    setRestS(initialRestS);
  }, [initialTargetSets, initialRepMin, initialRepMax, initialRestS, visible]);

  const handleSave = () => {
    triggerHaptic('success');
    onSave({
      targetSets,
      repMin: Math.min(repMin, repMax),
      repMax: Math.max(repMin, repMax),
      restS,
    });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={75}>
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.tagBadge}>
              <Text variant="labelSmall" style={styles.tagText}>
                Apenas esta sessão
              </Text>
            </View>
            <Text variant="headline" style={styles.title} numberOfLines={1}>
              {exerciseName || 'Editar exercício'}
            </Text>
            <View style={styles.infoRow}>
              <Info size={13} color={colors.primary} strokeWidth={2.2} />
              <Text variant="labelSmall" color="secondary">
                Alterações não afetam a ficha original
              </Text>
            </View>
          </View>
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
          contentContainerStyle={styles.content}
        >
          {/* 1. SÉRIES ALVO */}
          <View style={styles.cardSection}>
            <Text variant="labelSmall" color="secondary">
              Total de blocos de trabalho
            </Text>
            <View style={styles.stepperRow}>
              <Text variant="bodyLarge" style={styles.sectionTitle}>
                Séries
              </Text>
              <Stepper
                value={targetSets}
                min={1}
                max={10}
                step={1}
                onChange={setTargetSets}
                unit="séries"
              />
            </View>
          </View>

          {/* 2. FAIXA DE REPETIÇÕES */}
          <View style={styles.cardSection}>
            <Text variant="labelSmall" color="secondary">
              Faixa de repetições planejada
            </Text>
            <View style={styles.repsRow}>
              <View style={styles.repCol}>
                <Text variant="labelSmall" color="secondary">
                  Mínimo
                </Text>
                <Stepper
                  value={repMin}
                  min={1}
                  max={repMax}
                  step={1}
                  onChange={setRepMin}
                />
              </View>
              <View style={styles.repCol}>
                <Text variant="labelSmall" color="secondary">
                  Máximo
                </Text>
                <Stepper
                  value={repMax}
                  min={repMin}
                  max={50}
                  step={1}
                  onChange={setRepMax}
                />
              </View>
            </View>
          </View>

          {/* 3. DESCANSO ENTRE SÉRIES */}
          <View style={styles.cardSection}>
            <Text variant="labelSmall" color="secondary">
              Descanso entre séries
            </Text>
            <View style={styles.presetsRow}>
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
                      styles.presetChip,
                      isSelected && styles.presetChipSelected,
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextSelected,
                      ]}
                    >
                      {sec} s
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* BOTÃO SALVAR */}
          <Button
            title="Aplicar nesta sessão"
            variant="primary"
            icon={<Check size={20} color={colors.onPrimary} strokeWidth={2.4} />}
            onPress={handleSave}
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  content: {
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 32,
  },
  cardSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  repCol: {
    flex: 1,
    gap: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipSelected: {
    backgroundColor: 'rgba(255, 122, 89, 0.16)',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  presetChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  saveButton: {
    height: 52,
    borderRadius: radii.pill,
    marginTop: 8,
  },
});
