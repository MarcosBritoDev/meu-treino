import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Shield,
  Flame,
  Footprints,
  Target,
  BicepsFlexed,
  Grid3x3,
  Check,
  Dumbbell,
  SlidersHorizontal,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  ScreenHeader,
  Text,
  TextField,
  Button,
  ConfirmModal,
  triggerHaptic,
} from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import { createCustomExercise, getExercisesWithPR } from '../db/library';
import {
  ExerciseItemData,
  isExerciseNameDuplicate,
} from '../domain/search';
import { formatarPeso } from '../domain/weight';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MUSCLE_GRID = [
  { name: 'Peito', icon: Shield },
  { name: 'Costas', icon: Flame },
  { name: 'Pernas', icon: Footprints },
  { name: 'Ombros', icon: Target },
  { name: 'Braços', icon: BicepsFlexed },
  { name: 'Abdômen', icon: Grid3x3 },
] as const;

const EQUIPMENTS = [
  'Barra',
  'Halteres',
  'Cabo',
  'Máquina',
  'Peso corporal',
] as const;

export const NewExerciseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewExercise'>>();
  const initialName = route.params?.initialName ?? '';
  const fromScreen = route.params?.fromScreen;

  const { unit, defaultIncrement: storeIncrement, defaultRestS: storeRest } = useSettingsStore();

  const [name, setName] = useState(initialName);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Peito');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Barra');
  const [selectedIncrement, setSelectedIncrement] = useState<number>(storeIncrement);
  const [selectedRest, setSelectedRest] = useState<number>(storeRest);
  const [notes, setNotes] = useState<string>('');

  const [existingExercises, setExistingExercises] = useState<ExerciseItemData[]>([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carrega exercícios existentes para validação de duplicidade
  useEffect(() => {
    try {
      const data = getExercisesWithPR();
      setExistingExercises(data);
    } catch (e) {
      console.warn('Erro ao carregar exercícios para validação:', e);
    }
  }, []);

  // Opções de incremento baseadas na unidade do app
  const incrementOptions = useMemo(() => {
    return unit === 'kg' ? [1, 2, 2.5, 5] : [2.5, 5, 10];
  }, [unit]);

  // Opções de descanso padrão
  const restOptions = [60, 90, 120];

  // Verificação de nome duplicado no mesmo grupo
  const isDuplicate = useMemo(() => {
    return isExerciseNameDuplicate(name, selectedMuscle, existingExercises);
  }, [name, selectedMuscle, existingExercises]);

  // Validação para habilitar o botão de criação
  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      Boolean(selectedMuscle) &&
      !isDuplicate &&
      !isSaving
    );
  }, [name, selectedMuscle, isDuplicate, isSaving]);

  // Verifica se o usuário alterou dados do formulário
  const hasChanges = useMemo(() => {
    const nameChanged = name.trim() !== initialName.trim();
    const notesChanged = notes.trim().length > 0;
    const muscleChanged = selectedMuscle !== 'Peito';
    const equipChanged = selectedEquipment !== 'Barra';
    const incChanged = selectedIncrement !== storeIncrement;
    const restChanged = selectedRest !== storeRest;
    return (
      nameChanged ||
      notesChanged ||
      muscleChanged ||
      equipChanged ||
      incChanged ||
      restChanged
    );
  }, [
    name,
    initialName,
    notes,
    selectedMuscle,
    selectedEquipment,
    selectedIncrement,
    storeIncrement,
    selectedRest,
    storeRest,
  ]);

  const handleBack = useCallback(() => {
    if (hasChanges) {
      triggerHaptic('warning');
      setShowDiscardModal(true);
    } else {
      triggerHaptic('light');
      navigation.goBack();
    }
  }, [hasChanges, navigation]);

  // Captura botão voltar físico no Android
  useEffect(() => {
    const backAction = () => {
      if (hasChanges) {
        triggerHaptic('warning');
        setShowDiscardModal(true);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [hasChanges]);

  // Cria o exercício no SQLite
  const handleCreateExercise = useCallback(() => {
    if (!canSubmit) return;

    setIsSaving(true);
    triggerHaptic('success');

    try {
      const created = createCustomExercise({
        name: name.trim(),
        muscleGroup: selectedMuscle,
        equipment: selectedEquipment,
        kind: 'composto',
        defaultIncrement: selectedIncrement,
        defaultRestS: selectedRest,
        notes: notes.trim() || undefined,
      });

      // Retorna para a tela de origem
      if (fromScreen === 'AddExercises') {
        navigation.navigate({
          name: 'MainTabs' as any,
          params: { selectedExerciseId: created.id },
          merge: true,
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.warn('Erro ao salvar exercício customizado:', error);
      setIsSaving(false);
    }
  }, [
    canSubmit,
    name,
    selectedMuscle,
    selectedEquipment,
    selectedIncrement,
    selectedRest,
    notes,
    fromScreen,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Novo exercício" onBack={handleBack} />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contexto do Subtítulo */}
          <View style={styles.subtitleHeader}>
            <View style={styles.subtitleTextCol}>
              <Text variant="headline" style={styles.screenMainTitle}>
                Novo exercício
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.screenSubtitle}>
                Cadastre um movimento personalizado para seus treinos
              </Text>
            </View>
            <View style={styles.badgeCircle}>
              <Dumbbell size={20} color={colors.primary} strokeWidth={1.75} />
            </View>
          </View>

          {/* 1. Nome do Exercício */}
          <View style={styles.section}>
            <TextField
              label="Nome do exercício *"
              placeholder="Ex.: Remada cavalinho"
              value={name}
              onChangeText={setName}
              maxLength={60}
              showCounter
              error={isDuplicate ? 'Já existe um exercício com esse nome' : undefined}
            />
          </View>

          {/* 2. Grupo Muscular Principal */}
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <View>
                <Text variant="labelSmall" style={styles.fieldLabel}>
                  Grupo muscular principal <Text style={styles.asterisk}>*</Text>
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Selecione o músculo primário ativado
                </Text>
              </View>
              {selectedMuscle ? (
                <Text variant="labelSmall" style={styles.selectedCount}>
                  1 selecionado
                </Text>
              ) : null}
            </View>

            {/* Grade 3x2 */}
            <View style={styles.muscleGrid}>
              {MUSCLE_GRID.map((item) => {
                const isSelected = selectedMuscle === item.name;
                const IconComponent = item.icon;

                return (
                  <Pressable
                    key={item.name}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedMuscle(item.name);
                    }}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Grupo muscular ${item.name}`}
                    style={[
                      styles.muscleCard,
                      isSelected
                        ? styles.muscleCardSelected
                        : styles.muscleCardUnselected,
                    ]}
                  >
                    <IconComponent
                      size={28}
                      color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
                      strokeWidth={1.75}
                      style={styles.muscleIcon}
                    />
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.muscleCardText,
                        isSelected
                          ? styles.muscleCardTextSelected
                          : styles.muscleCardTextUnselected,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. Equipamento Utilizado */}
          <View style={styles.section}>
            <Text variant="labelSmall" style={styles.fieldLabel}>
              Equipamento utilizado
            </Text>
            <View style={styles.equipmentRow}>
              {EQUIPMENTS.map((eq) => {
                const isSelected = selectedEquipment === eq;

                return (
                  <Pressable
                    key={eq}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedEquipment(eq);
                    }}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Equipamento ${eq}`}
                    style={[
                      styles.eqChip,
                      isSelected ? styles.eqChipSelected : styles.eqChipUnselected,
                    ]}
                  >
                    {isSelected && (
                      <Check
                        size={16}
                        color={colors.onPrimary}
                        strokeWidth={2.2}
                        style={styles.eqCheckIcon}
                      />
                    )}
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.eqChipText,
                        isSelected
                          ? styles.eqChipTextSelected
                          : styles.eqChipTextUnselected,
                      ]}
                    >
                      {eq}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Cartão: Parâmetros Padrão */}
          <View style={styles.paramsCard}>
            <View style={styles.paramsCardHeader}>
              <View style={styles.tuneIconBox}>
                <SlidersHorizontal
                  size={16}
                  color={colors.primary}
                  strokeWidth={2}
                />
              </View>
              <Text variant="headline" style={styles.paramsCardTitle}>
                Parâmetros padrão
              </Text>
            </View>

            {/* Incremento mínimo */}
            <View style={styles.paramSubSection}>
              <View style={styles.paramLabelRow}>
                <Text variant="bodySmall" color="secondary">
                  Incremento mínimo de peso
                </Text>
                <Text variant="labelSmall" tabular style={styles.paramHighlightValue}>
                  {`+${formatarPeso(selectedIncrement, unit)}`}
                </Text>
              </View>
              <View style={styles.paramChipsGrid}>
                {incrementOptions.map((inc) => {
                  const isSelected = selectedIncrement === inc;
                  const label = `+${formatarPeso(inc, unit)}`;

                  return (
                    <Pressable
                      key={inc}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedIncrement(inc);
                      }}
                      style={[
                        styles.paramChip,
                        isSelected
                          ? styles.paramChipSelected
                          : styles.paramChipUnselected,
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        tabular
                        style={[
                          styles.paramChipText,
                          isSelected
                            ? styles.paramChipTextSelected
                            : styles.paramChipTextUnselected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Descanso padrão */}
            <View style={styles.paramSubSection}>
              <View style={styles.paramLabelRow}>
                <Text variant="bodySmall" color="secondary">
                  Descanso padrão entre séries
                </Text>
                <Text variant="labelSmall" tabular style={styles.paramHighlightValue}>
                  {`${selectedRest} s`}
                </Text>
              </View>
              <View style={styles.paramChipsGrid}>
                {restOptions.map((sec) => {
                  const isSelected = selectedRest === sec;
                  const label = `${sec} s`;

                  return (
                    <Pressable
                      key={sec}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedRest(sec);
                      }}
                      style={[
                        styles.paramChip,
                        isSelected
                          ? styles.paramChipSelected
                          : styles.paramChipUnselected,
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        tabular
                        style={[
                          styles.paramChipText,
                          isSelected
                            ? styles.paramChipTextSelected
                            : styles.paramChipTextUnselected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 5. Notas e Instruções (Textarea opcional) */}
          <View style={styles.section}>
            <View style={styles.notesLabelRow}>
              <Text variant="labelSmall" style={styles.fieldLabel}>
                Notas e instruções
              </Text>
              <Text variant="labelSmall" color="secondary">
                Opcional
              </Text>
            </View>
            <View style={styles.textareaWrapper}>
              <TextInput
                style={styles.textareaInput}
                placeholder="Dicas posturais, ajuste do banco, pegada…"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                maxFontSizeMultiplier={1.3}
              />
              <Text variant="labelSmall" color="muted" tabular style={styles.textareaCounter}>
                {`${notes.length}/500`}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* 6. Rodapé Fixo (Floating CTA) */}
        <View style={styles.fixedFooter}>
          <Button
            title="Criar exercício"
            variant="primary"
            icon={<Check size={20} color={colors.onPrimary} strokeWidth={2.2} />}
            onPress={handleCreateExercise}
            disabled={!canSubmit}
            loading={isSaving}
            style={styles.submitButton}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Confirmação para Descarte */}
      <ConfirmModal
        visible={showDiscardModal}
        title="Descartar exercício?"
        description="As alterações não salvas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        isDanger={true}
        onConfirm={() => {
          setShowDiscardModal(false);
          navigation.goBack();
        }}
        onCancel={() => setShowDiscardModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #1A1715
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: 110, // Garante que o CTA fixo não cubra o último campo
    gap: spacing.lg,
  },
  subtitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  subtitleTextCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  screenMainTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.onSurface,
  },
  screenSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  badgeCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer, // #3A251F
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  asterisk: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectedCount: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  muscleCard: {
    width: '31.3%',
    height: 90,
    borderRadius: radii.input, // 16px
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  muscleCardSelected: {
    backgroundColor: colors.primary, // #FF7A59
    borderWidth: 1,
    borderColor: colors.primary,
  },
  muscleCardUnselected: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
  },
  muscleIcon: {
    marginBottom: 6,
  },
  muscleCardText: {
    fontSize: 13,
    fontWeight: '600',
  },
  muscleCardTextSelected: {
    color: colors.onPrimary, // #1A1715
  },
  muscleCardTextUnselected: {
    color: colors.onSurface, // #F5EFE8
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 1,
    marginTop: 4,
  },
  eqChip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqChipSelected: {
    backgroundColor: colors.primary, // #FF7A59
  },
  eqChipUnselected: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
  },
  eqCheckIcon: {
    marginRight: 6,
  },
  eqChipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  eqChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  eqChipTextUnselected: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  paramsCard: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    padding: spacing.md,
    gap: spacing.md,
  },
  paramsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tuneIconBox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramsCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  paramSubSection: {
    gap: spacing.xs,
  },
  paramLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paramHighlightValue: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  paramChipsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paramChip: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramChipSelected: {
    backgroundColor: colors.primary, // #FF7A59
  },
  paramChipUnselected: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
  },
  paramChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  paramChipTextSelected: {
    color: colors.onPrimary,
  },
  paramChipTextUnselected: {
    color: colors.onSurface,
  },
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textareaWrapper: {
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: radii.input, // 16px
    padding: spacing.sm + 2,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  textareaInput: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    padding: 0,
    minHeight: 64,
  },
  textareaCounter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: 4,
  },
  fixedFooter: {
    backgroundColor: 'rgba(26, 23, 21, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs + 2,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  submitButton: {
    width: '100%',
  },
});
