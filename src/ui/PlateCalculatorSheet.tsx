import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { X, Dumbbell, Minus, Plus } from 'lucide-react-native';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { calculatePlates } from '../domain/plates';
import { triggerHaptic } from './haptics';

export interface PlateCalculatorSheetProps {
  visible: boolean;
  onClose: () => void;
  initialWeight?: number;
  unit?: string;
  exerciseName?: string;
}

const BAR_OPTIONS = [
  { label: '20 kg (Olímpica)', weight: 20 },
  { label: '15 kg (Feminina)', weight: 15 },
  { label: '10 kg (Barra W)', weight: 10 },
  { label: 'Sem barra (0 kg)', weight: 0 },
];

export const PlateCalculatorSheet: React.FC<PlateCalculatorSheetProps> = ({
  visible,
  onClose,
  initialWeight = 60,
  unit = 'kg',
  exerciseName,
}) => {
  const [targetWeight, setTargetWeight] = useState(initialWeight || 60);
  const [selectedBarWeight, setSelectedBarWeight] = useState(20);

  // Sincroniza se initialWeight mudar
  React.useEffect(() => {
    if (initialWeight && initialWeight > 0) {
      setTargetWeight(initialWeight);
    }
  }, [initialWeight]);

  const calculation = useMemo(() => {
    return calculatePlates(targetWeight, selectedBarWeight);
  }, [targetWeight, selectedBarWeight]);

  const adjustWeight = (delta: number) => {
    triggerHaptic('selection');
    setTargetWeight((prev) => Math.max(0, Number((prev + delta).toFixed(1))));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={75}>
      <View style={styles.container}>
        {/* CABEÇALHO DA SHEET */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headline" style={styles.title}>
              Calculadora de anilhas
            </Text>
            {exerciseName ? (
              <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                {exerciseName}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar calculadora"
          >
            <X size={20} color={colors.onSurfaceVariant} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* CARGA TOTAL ALVO COM STEPPERS */}
          <View style={styles.cardSection}>
            <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
              Carga total desejada
            </Text>
            <View style={styles.weightSelectorRow}>
              <Pressable
                onPress={() => adjustWeight(-5)}
                style={styles.stepButton}
                accessibilityRole="button"
                accessibilityLabel="Diminuir 5 kg"
              >
                <Minus size={20} color={colors.onSurface} strokeWidth={2.4} />
              </Pressable>

              <View style={styles.weightDisplay}>
                <Text variant="headline" style={styles.targetNumber}>
                  {targetWeight}
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.targetUnit}>
                  {unit}
                </Text>
              </View>

              <Pressable
                onPress={() => adjustWeight(5)}
                style={styles.stepButton}
                accessibilityRole="button"
                accessibilityLabel="Aumentar 5 kg"
              >
                <Plus size={20} color={colors.onSurface} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* ATALHOS RÁPIDOS DE AJUSTE FINO */}
            <View style={styles.quickStepsRow}>
              {[-10, -2.5, +2.5, +10].map((step) => (
                <Pressable
                  key={step}
                  onPress={() => adjustWeight(step)}
                  style={styles.quickStepChip}
                >
                  <Text variant="labelSmall" style={styles.quickStepText}>
                    {step > 0 ? `+${step}` : step} {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* SELEÇÃO DO TIPO DE BARRA */}
          <View style={styles.cardSection}>
            <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
              Peso da barra
            </Text>
            <View style={styles.barOptionsRow}>
              {BAR_OPTIONS.map((bar) => {
                const isSelected = selectedBarWeight === bar.weight;
                return (
                  <Pressable
                    key={bar.weight}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedBarWeight(bar.weight);
                    }}
                    style={[
                      styles.barChip,
                      isSelected && styles.barChipSelected,
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.barChipText,
                        isSelected && styles.barChipTextSelected,
                      ]}
                    >
                      {bar.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* RESULTADO: ANILHAS POR LADO */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.dumbbellIconCircle}>
                <Dumbbell size={20} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View>
                <Text variant="headline" style={styles.resultTitle}>
                  {calculation.weightPerSide} {unit} por lado
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Coloque em cada ponta da barra:
                </Text>
              </View>
            </View>

            {calculation.platesPerSide.length > 0 ? (
              <View style={styles.platesList}>
                {calculation.platesPerSide.map((item, idx) => (
                  <View key={idx} style={styles.plateRow}>
                    <View style={styles.plateBadge}>
                      <Text variant="headline" style={styles.plateCountText}>
                        {item.count}×
                      </Text>
                    </View>
                    <Text variant="bodyLarge" style={styles.plateWeightText}>
                      Anilha de {item.plate} {unit}
                    </Text>
                    <Text variant="labelSmall" color="secondary" style={styles.subtotalText}>
                      = {item.count * item.plate} {unit}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPlatesBox}>
                <Text variant="bodyMedium" color="secondary" style={{ textAlign: 'center' }}>
                  {targetWeight <= selectedBarWeight
                    ? 'Apenas o peso da própria barra já atinge ou supera a carga.'
                    : 'Nenhuma anilha necessária.'}
                </Text>
              </View>
            )}

            {calculation.remainder > 0 ? (
              <View style={styles.remainderNotice}>
                <Text variant="labelSmall" style={styles.remainderText}>
                  Restam {calculation.remainder} {unit} sem combinação exata de anilhas.
                </Text>
              </View>
            ) : null}
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
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
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  weightSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  targetNumber: {
    fontSize: 36,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  targetUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickStepChip: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  barOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  barChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  barChipSelected: {
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    borderColor: colors.primary,
  },
  barChipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  barChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.25)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dumbbellIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  platesList: {
    gap: 8,
    marginTop: 4,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 14,
  },
  plateBadge: {
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  plateCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  plateWeightText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  subtotalText: {
    fontSize: 12,
  },
  emptyPlatesBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
  },
  remainderNotice: {
    backgroundColor: 'rgba(255, 196, 107, 0.12)',
    padding: 10,
    borderRadius: 10,
  },
  remainderText: {
    color: colors.pr,
    fontSize: 12,
    textAlign: 'center',
  },
});
