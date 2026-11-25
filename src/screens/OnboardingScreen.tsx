import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import { Card, Text, Button, triggerHaptic } from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  Zap,
  Dumbbell,
  Disc,
  Timer,
  Clock,
  ArrowRight,
  Lock,
  Check,
} from 'lucide-react-native';

const KG_INCREMENTS = [
  { value: 1.0, label: '+1', unit: 'kg' },
  { value: 2.0, label: '+2', unit: 'kg' },
  { value: 2.5, label: '+2,5', unit: 'kg' },
  { value: 5.0, label: '+5', unit: 'kg' },
];

const LB_INCREMENTS = [
  { value: 2.5, label: '+2,5', unit: 'lb' },
  { value: 5.0, label: '+5', unit: 'lb' },
  { value: 10.0, label: '+10', unit: 'lb' },
  { value: 15.0, label: '+15', unit: 'lb' },
];

const REST_OPTIONS = [
  { value: 60, label: '60 s' },
  { value: 90, label: '90 s' },
  { value: 120, label: '120 s' },
  { value: 180, label: '180 s' },
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completeOnboarding } = useSettingsStore();

  // Estados locais com os valores padrão pré-selecionados
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lb'>('kg');
  const [selectedIncrement, setSelectedIncrement] = useState<number>(2.5);
  const [selectedRest, setSelectedRest] = useState<number>(90);
  const [loading, setLoading] = useState(false);

  // Troca de unidade: atualiza unidade e recalibra o incremento padrão
  const handleUnitChange = (unit: 'kg' | 'lb') => {
    if (unit === selectedUnit) return;
    triggerHaptic('selection');
    setSelectedUnit(unit);
    // Se mudar para lb, padrão +5 lb; se voltar para kg, padrão +2,5 kg
    setSelectedIncrement(unit === 'lb' ? 5.0 : 2.5);
  };

  const handleIncrementChange = (val: number) => {
    triggerHaptic('selection');
    setSelectedIncrement(val);
  };

  const handleRestChange = (val: number) => {
    triggerHaptic('selection');
    setSelectedRest(val);
  };

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    triggerHaptic('medium');

    try {
      await completeOnboarding({
        unit: selectedUnit,
        defaultIncrement: selectedIncrement,
        defaultRestS: selectedRest,
      });

      // Navega para MainTabs limpando a pilha para impossibilitar voltar ao onboarding
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (err) {
      console.warn('Erro ao concluir calibração inicial:', err);
      setLoading(false);
    }
  };

  const currentIncrements = selectedUnit === 'kg' ? KG_INCREMENTS : LB_INCREMENTS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Marca & Boas-Vindas */}
        <View style={styles.brandHeader}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Zap size={22} color={colors.primary} fill={colors.primary} />
            </View>
            <Text variant="headline" style={styles.brandName}>
              Volt Precision
            </Text>
          </View>

          <Text variant="displayMedium" style={styles.welcomeTitle}>
            Vamos ajustar o básico
          </Text>

          <Text variant="bodyMedium" color="secondary" style={styles.welcomeSubtitle}>
            Leva menos de 30 segundos e calibra os incrementos ideais para os seus treinos.
          </Text>
        </View>

        {/* 1. Cartão Unidade de peso */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleLeft}>
              <Dumbbell size={20} color={colors.primary} strokeWidth={1.75} />
              <Text variant="headline" style={styles.cardTitle}>
                Unidade de peso
              </Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text variant="labelSmall" color="secondary" style={styles.badgeText}>
                Padrão
              </Text>
            </View>
          </View>

          <View style={styles.unitSelectorContainer} role="radiogroup">
            <Pressable
              onPress={() => handleUnitChange('kg')}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedUnit === 'kg' }}
              accessibilityLabel="Quilos (kg)"
              style={({ pressed }) => [
                styles.unitOption,
                selectedUnit === 'kg' ? styles.unitOptionSelected : styles.unitOptionUnselected,
                pressed && selectedUnit !== 'kg' && styles.unitOptionPressed,
              ]}
            >
              <View style={styles.unitOptionContent}>
                {selectedUnit === 'kg' && (
                  <Check size={18} color={colors.onPrimary} strokeWidth={2.5} style={styles.checkIcon} />
                )}
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.unitOptionText,
                    selectedUnit === 'kg' ? styles.textSelectedDark : styles.textUnselectedMuted,
                  ]}
                >
                  Quilos (kg)
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleUnitChange('lb')}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedUnit === 'lb' }}
              accessibilityLabel="Libras (lb)"
              style={({ pressed }) => [
                styles.unitOption,
                selectedUnit === 'lb' ? styles.unitOptionSelected : styles.unitOptionUnselected,
                pressed && selectedUnit !== 'lb' && styles.unitOptionPressed,
              ]}
            >
              <View style={styles.unitOptionContent}>
                {selectedUnit === 'lb' && (
                  <Check size={18} color={colors.onPrimary} strokeWidth={2.5} style={styles.checkIcon} />
                )}
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.unitOptionText,
                    selectedUnit === 'lb' ? styles.textSelectedDark : styles.textUnselectedMuted,
                  ]}
                >
                  Libras (lb)
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* 2. Cartão Menor anilha que você usa */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeaderCol}>
            <View style={styles.titleLeft}>
              <Disc size={20} color={colors.primary} strokeWidth={1.75} />
              <Text variant="headline" style={styles.cardTitle}>
                Menor anilha que você usa
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={styles.cardSubtitle}>
              Define quanto a carga sobe a cada ajuste
            </Text>
          </View>

          <View style={styles.chipsGrid} role="radiogroup">
            {currentIncrements.map((item) => {
              const isSelected = selectedIncrement === item.value;
              return (
                <Pressable
                  key={`${item.value}-${item.unit}`}
                  onPress={() => handleIncrementChange(item.value)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Incremento ${item.label} ${item.unit}`}
                  style={({ pressed }) => [
                    styles.plateChip,
                    isSelected ? styles.plateChipSelected : styles.plateChipUnselected,
                    pressed && !isSelected && styles.chipPressed,
                  ]}
                >
                  <Text
                    variant="headline"
                    style={[
                      styles.plateValueText,
                      isSelected ? styles.textSelectedDark : styles.textUnselectedPrimary,
                    ]}
                    tabular
                  >
                    {item.label}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.plateUnitText,
                      isSelected ? styles.unitTextSelectedDark : styles.unitTextUnselectedMuted,
                    ]}
                  >
                    {item.unit}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 3. Cartão Descanso entre séries */}
        <Card variant="surface" style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleLeft}>
              <Timer size={20} color={colors.primary} strokeWidth={1.75} />
              <Text variant="headline" style={styles.cardTitle}>
                Descanso entre séries
              </Text>
            </View>
            <View style={styles.autoBadge}>
              <View style={styles.dotIndicator} />
              <Text variant="labelSmall" color="coral" style={styles.autoBadgeText}>
                Automático
              </Text>
            </View>
          </View>

          <View style={styles.chipsGrid} role="radiogroup">
            {REST_OPTIONS.map((item) => {
              const isSelected = selectedRest === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleRestChange(item.value)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Descanso de ${item.label}`}
                  style={({ pressed }) => [
                    styles.restChip,
                    isSelected ? styles.restChipSelected : styles.restChipUnselected,
                    pressed && !isSelected && styles.chipPressed,
                  ]}
                >
                  <Text
                    variant="headline"
                    style={[
                      styles.restValueText,
                      isSelected ? styles.textSelectedDark : styles.textUnselectedPrimary,
                    ]}
                    tabular
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.helperRow}>
            <Clock size={16} color={colors.primary} strokeWidth={1.75} />
            <Text variant="bodySmall" color="secondary" style={styles.helperText}>
              O timer começa sozinho ao concluir cada série.
            </Text>
          </View>
        </Card>

        {/* Espaçador flexível para rolagem confortável */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botão Fixo na Zona do Polegar & Rodapé */}
      <View style={styles.fixedFooter}>
        <Button
          title="Começar"
          variant="primary"
          onPress={handleStart}
          loading={loading}
          iconPosition="right"
          icon={<ArrowRight size={20} color={colors.onPrimary} strokeWidth={2.5} />}
          style={styles.startButton}
        />

        <View style={styles.privacyRow}>
          <Lock size={14} color={colors.textMuted} strokeWidth={1.75} />
          <Text variant="labelSmall" color="muted" style={styles.privacyText}>
            Seus dados ficam só neste aparelho. Sem conta, sem nuvem.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.gutter,
  },
  brandHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    color: colors.onSurface,
  },
  welcomeTitle: {
    color: colors.onSurface,
  },
  welcomeSubtitle: {
    marginTop: 2,
  },
  sectionCard: {
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderCol: {
    gap: 4,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  cardSubtitle: {
    marginLeft: 28,
  },
  defaultBadge: {
    backgroundColor: colors.surfaceBright,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 6,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  autoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unitSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceDim,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  unitOption: {
    flex: 1,
    minHeight: spacing.touchTargetMin,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  unitOptionSelected: {
    backgroundColor: colors.primary,
  },
  unitOptionUnselected: {
    backgroundColor: colors.transparent,
  },
  unitOptionPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  unitOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkIcon: {
    marginRight: 2,
  },
  unitOptionText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '600',
  },
  textSelectedDark: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  textUnselectedMuted: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  textUnselectedPrimary: {
    color: colors.onSurface,
  },
  chipsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  plateChip: {
    flex: 1,
    height: 56,
    minHeight: spacing.touchTargetMin,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 4,
  },
  plateChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  plateChipUnselected: {
    backgroundColor: colors.surfaceDim,
    borderColor: colors.outlineVariant,
  },
  chipPressed: {
    opacity: 0.85,
  },
  plateValueText: {
    fontSize: 16,
    lineHeight: 20,
  },
  plateUnitText: {
    fontSize: 11,
    lineHeight: 14,
  },
  unitTextSelectedDark: {
    color: colors.onPrimary,
    opacity: 0.9,
  },
  unitTextUnselectedMuted: {
    color: colors.textMuted,
  },
  restChip: {
    flex: 1,
    height: 48,
    minHeight: spacing.touchTargetMin,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  restChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restChipUnselected: {
    backgroundColor: colors.surfaceDim,
    borderColor: colors.outlineVariant,
  },
  restValueText: {
    fontSize: 15,
    lineHeight: 20,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  helperText: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.md,
  },
  fixedFooter: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  startButton: {
    width: '100%',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: spacing.xs,
  },
  privacyText: {
    textAlign: 'center',
  },
});
