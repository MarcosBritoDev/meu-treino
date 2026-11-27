import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Check,
  ChevronRight,
  Dumbbell,
  Boxes,
  Cable,
  User,
  Sliders,
  CircleDot,
  ShieldCheck,
  HeartPulse,
  Ellipsis,
  Trash2,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, fontFamilies } from '../theme';
import {
  ScreenHeader,
  Text,
  TextField,
  Button,
  ConfirmModal,
  triggerHaptic,
  MuscleIcon,
  EquipmentPickerSheet,
  MusclePickerSheet,
} from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  getExerciseById,
  getExercisesWithPR,
} from '../db/library';
import { ExerciseItemData } from '../domain/search';
import {
  Equipment,
  Muscle,
  DefaultTargetType,
  normalizeEquipmentName,
  normalizeMuscleName,
  parseSecondaryMuscles,
} from '../domain/exerciseCatalog';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Retorna o ícone representativo correspondente a cada equipamento
 */
const getEquipmentIcon = (equipmentName: string) => {
  const norm = normalizeEquipmentName(equipmentName);
  switch (norm) {
    case 'Barra':
      return Dumbbell;
    case 'Halteres':
      return Dumbbell;
    case 'Máquina':
      return Boxes;
    case 'Cabo / Polia':
      return Cable;
    case 'Peso corporal':
      return User;
    case 'Smith':
      return Sliders;
    case 'Kettlebell':
      return CircleDot;
    case 'Barra de segurança':
      return ShieldCheck;
    case 'Cardio':
      return HeartPulse;
    case 'Outro':
    default:
      return Ellipsis;
  }
};

export const NewExerciseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewExercise'>>();
  const insets = useSafeAreaInsets();

  const exerciseId = route.params?.exerciseId;
  const initialNameParam = route.params?.initialName ?? '';
  const fromScreen = route.params?.fromScreen;
  const isEditMode = Boolean(exerciseId);

  const { defaultIncrement: storeIncrement, defaultRestS: storeRest } = useSettingsStore();

  // Dados originais para comparação e edição
  const [initialExercise, setInitialExercise] = useState<ExerciseItemData | null>(null);

  // Estados do formulário
  const [name, setName] = useState(initialNameParam);
  const [targetType, setTargetType] = useState<DefaultTargetType>('reps');
  const [equipment, setEquipment] = useState<Equipment>('Barra');
  const [primaryMuscle, setPrimaryMuscle] = useState<Muscle>('Peito');
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isCustom, setIsCustom] = useState(true);

  // Estados visuais e validação
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Controle de visibilidade dos modais sob demanda
  const [equipmentPickerVisible, setEquipmentPickerVisible] = useState(false);
  const [musclePickerVisible, setMusclePickerVisible] = useState(false);
  const [secondaryPickerVisible, setSecondaryPickerVisible] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [existingExercises, setExistingExercises] = useState<ExerciseItemData[]>([]);

  // Carrega lista para checagem de duplicidade e dados do exercício se for modo edição
  useEffect(() => {
    try {
      const data = getExercisesWithPR();
      setExistingExercises(data);
    } catch (e) {
      console.warn('Erro ao carregar exercícios:', e);
    }

    if (exerciseId) {
      const ex = getExerciseById(exerciseId);
      if (ex) {
        setInitialExercise(ex);
        setName(ex.name);
        setTargetType((ex.defaultTargetType as DefaultTargetType) || 'reps');
        setEquipment(normalizeEquipmentName(ex.equipment));
        setPrimaryMuscle(normalizeMuscleName(ex.muscleGroup));
        setSecondaryMuscles(parseSecondaryMuscles(ex.secondaryMuscles));
        setNotes(ex.notes || '');
        setIsCustom(Boolean(ex.isCustom));
      }
    }
  }, [exerciseId]);

  // Ícone do equipamento selecionado
  const EquipmentIconComponent = useMemo(() => getEquipmentIcon(equipment), [equipment]);

  // Músculo representativo para o ícone dos secundários (primeiro ou 'Outro')
  const secondaryIconMuscle = useMemo(() => {
    return secondaryMuscles.length > 0 ? secondaryMuscles[0] : 'Outro';
  }, [secondaryMuscles]);

  // Verifica se o usuário alterou dados do formulário
  const hasChanges = useMemo(() => {
    if (isEditMode && initialExercise) {
      const nameChanged = name.trim() !== initialExercise.name.trim();
      const targetChanged = targetType !== (initialExercise.defaultTargetType || 'reps');
      const eqChanged = normalizeEquipmentName(equipment) !== normalizeEquipmentName(initialExercise.equipment);
      const primChanged = normalizeMuscleName(primaryMuscle) !== normalizeMuscleName(initialExercise.muscleGroup);
      const initialSec = parseSecondaryMuscles(initialExercise.secondaryMuscles);
      const secChanged =
        JSON.stringify(secondaryMuscles.map((m) => normalizeMuscleName(m)).sort()) !==
        JSON.stringify(initialSec.map((m) => normalizeMuscleName(m)).sort());
      const notesChanged = notes.trim() !== (initialExercise.notes || '').trim();
      return nameChanged || targetChanged || eqChanged || primChanged || secChanged || notesChanged;
    }

    const nameChanged = name.trim() !== initialNameParam.trim();
    const targetChanged = targetType !== 'reps';
    const eqChanged = equipment !== 'Barra';
    const primChanged = primaryMuscle !== 'Peito';
    const secChanged = secondaryMuscles.length > 0;
    const notesChanged = notes.trim().length > 0;
    return nameChanged || targetChanged || eqChanged || primChanged || secChanged || notesChanged;
  }, [
    isEditMode,
    initialExercise,
    name,
    initialNameParam,
    targetType,
    equipment,
    primaryMuscle,
    secondaryMuscles,
    notes,
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

  // Intercepta botão voltar físico no Android
  useEffect(() => {
    const backAction = () => {
      if (hasChanges) {
        triggerHaptic('warning');
        setShowDiscardModal(true);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [hasChanges]);

  // Salvar exercício (criação ou edição)
  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Informe o nome do exercício');
      triggerHaptic('warning');
      return;
    }

    // Verifica duplicidade dentro do mesmo grupo muscular
    const isDuplicate = existingExercises.some((ex) => {
      if (isEditMode && ex.id === exerciseId) return false;
      return (
        ex.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        normalizeMuscleName(ex.muscleGroup) === normalizeMuscleName(primaryMuscle)
      );
    });

    if (isDuplicate) {
      setNameError('Já existe um exercício com esse nome');
      triggerHaptic('warning');
      return;
    }

    setIsSaving(true);
    triggerHaptic('success');

    try {
      if (isEditMode && exerciseId) {
        updateCustomExercise(exerciseId, {
          name: trimmedName,
          muscleGroup: primaryMuscle,
          equipment,
          kind: initialExercise?.kind || 'composto',
          defaultIncrement: initialExercise?.defaultIncrement ?? storeIncrement,
          defaultRestS: initialExercise?.defaultRestS ?? storeRest,
          notes: notes.trim() || null,
          secondaryMuscles,
          defaultTargetType: targetType,
        });

        navigation.goBack();
      } else {
        const created = createCustomExercise({
          name: trimmedName,
          muscleGroup: primaryMuscle,
          equipment,
          kind: 'composto',
          defaultIncrement: storeIncrement,
          defaultRestS: storeRest,
          notes: notes.trim() || undefined,
          secondaryMuscles,
          defaultTargetType: targetType,
        });

        if (fromScreen === 'AddExercises') {
          navigation.navigate({
            name: 'MainTabs' as any,
            params: { selectedExerciseId: created.id },
            merge: true,
          });
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.warn('Erro ao salvar exercício:', error);
      setIsSaving(false);
    }
  }, [
    name,
    existingExercises,
    isEditMode,
    exerciseId,
    primaryMuscle,
    equipment,
    initialExercise,
    storeIncrement,
    storeRest,
    notes,
    secondaryMuscles,
    targetType,
    fromScreen,
    navigation,
  ]);

  // Excluir exercício customizado (protegido por ConfirmModal temático)
  const handleConfirmDelete = useCallback(() => {
    if (!exerciseId) return;
    triggerHaptic('warning');
    setShowDeleteModal(true);
  }, [exerciseId]);

  const executeDelete = useCallback(() => {
    if (!exerciseId) return;
    setIsSaving(true);
    setShowDeleteModal(false);
    try {
      const success = deleteCustomExercise(exerciseId);
      if (success) {
        triggerHaptic('success');
        if (fromScreen === 'Biblioteca') {
          navigation.navigate('MainTabs', { screen: 'Biblioteca' } as any);
        } else {
          navigation.goBack();
        }
      } else {
        setIsSaving(false);
      }
    } catch (err) {
      console.warn('Erro ao excluir exercício:', err);
      setIsSaving(false);
    }
  }, [exerciseId, fromScreen, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Cabeçalho com botão voltar 48x48dp e título semântico */}
      <ScreenHeader
        title={isEditMode ? 'Editar exercício' : 'Novo exercício'}
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: (isEditMode && isCustom ? 160 : 120) + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Nome do exercício */}
          <View style={styles.fieldBlock}>
            <TextField
              label="Nome do exercício *"
              placeholder="Ex.: Remada cavalinho"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError(undefined);
              }}
              maxLength={60}
              showCounter
              error={nameError}
            />
          </View>

          {/* 2. Tipo de meta padrão (Repetições | Tempo com minHeight 48dp por opção) */}
          <View style={styles.fieldBlock}>
            <Text variant="labelSmall" style={styles.label}>
              Tipo de meta padrão
            </Text>
            <View style={styles.segmentedContainer}>
              <Pressable
                onPress={() => {
                  if (targetType !== 'reps') {
                    triggerHaptic('selection');
                    setTargetType('reps');
                  }
                }}
                accessible={true}
                accessibilityRole="tab"
                accessibilityState={{ selected: targetType === 'reps' }}
                accessibilityLabel="Repetições"
                style={[
                  styles.segmentOption,
                  targetType === 'reps' && styles.segmentOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    targetType === 'reps' ? styles.segmentTextSelected : styles.segmentTextUnselected,
                  ]}
                >
                  Repetições
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (targetType !== 'time') {
                    triggerHaptic('selection');
                    setTargetType('time');
                  }
                }}
                accessible={true}
                accessibilityRole="tab"
                accessibilityState={{ selected: targetType === 'time' }}
                accessibilityLabel="Tempo"
                style={[
                  styles.segmentOption,
                  targetType === 'time' && styles.segmentOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    targetType === 'time' ? styles.segmentTextSelected : styles.segmentTextUnselected,
                  ]}
                >
                  Tempo
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 3. Seção Classificação (3 linhas clicáveis limpas, minHeight: 60, fundo #23201D) */}
          <View style={styles.fieldBlock}>
            <Text variant="labelSmall" style={styles.label}>
              Classificação
            </Text>
            <View style={styles.classificationContainer}>
              {/* Linha 1: Equipamento */}
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setEquipmentPickerVisible(true);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Equipamento: ${equipment}. Toque para alterar`}
                style={styles.classificationRow}
              >
                <View style={styles.rowIconContainer}>
                  <EquipmentIconComponent size={20} color={colors.primary} strokeWidth={1.75} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Equipamento</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {equipment}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>

              <View style={styles.divider} />

              {/* Linha 2: Músculo principal */}
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setMusclePickerVisible(true);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Músculo principal: ${primaryMuscle}. Toque para alterar`}
                style={styles.classificationRow}
              >
                <View style={styles.rowIconContainer}>
                  <MuscleIcon muscle={primaryMuscle} size={28} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Músculo principal</Text>
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {primaryMuscle}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>

              <View style={styles.divider} />

              {/* Linha 3: Músculos secundários (opcional) */}
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  setSecondaryPickerVisible(true);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  secondaryMuscles.length > 0
                    ? `Músculos secundários: ${secondaryMuscles.join(', ')}. Toque para alterar`
                    : 'Músculos secundários: nenhum selecionado. Toque para selecionar'
                }
                style={styles.classificationRow}
              >
                <View style={styles.rowIconContainer}>
                  <MuscleIcon
                    muscle={secondaryIconMuscle}
                    muted={secondaryMuscles.length === 0}
                    size={28}
                  />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Músculos secundários (opcional)</Text>
                  {secondaryMuscles.length > 0 ? (
                    <View style={styles.chipsWrap}>
                      {secondaryMuscles.slice(0, 3).map((muscle) => (
                        <View key={muscle} style={styles.chipTag}>
                          <Text style={styles.chipTagText}>{muscle}</Text>
                        </View>
                      ))}
                      {secondaryMuscles.length > 3 && (
                        <View style={[styles.chipTag, styles.chipTagMore]}>
                          <Text style={styles.chipTagMoreText}>
                            {`+${secondaryMuscles.length - 3}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.emptySecondaryText}>Nenhum selecionado</Text>
                  )}
                </View>
                <ChevronRight size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>
            </View>
          </View>

          {/* 4. Notas de execução (opcional) */}
          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text variant="labelSmall" style={styles.label}>
                Notas de execução
              </Text>
              <Text variant="labelSmall" color="secondary">
                Opcional
              </Text>
            </View>
            <View
              style={[
                styles.textareaContainer,
                isNotesFocused && styles.textareaFocused,
              ]}
            >
              <TextInput
                style={styles.textareaInput}
                placeholder="Dicas posturais, ajuste do banco, pegada…"
                placeholderTextColor={colors.textMuted} // #7D746B
                value={notes}
                onChangeText={setNotes}
                onFocus={() => setIsNotesFocused(true)}
                onBlur={() => setIsNotesFocused(false)}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                maxFontSizeMultiplier={1.3}
              />
              <Text variant="labelSmall" color="muted" tabular style={styles.counterText}>
                {`${notes.length}/500`}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Rodapé fixo seguro com insets.bottom */}
        <View
          style={[
            styles.fixedFooter,
            { paddingBottom: Math.max(spacing.md, insets.bottom + 8) },
          ]}
        >
          {/* Botão destrutivo "Excluir" no modo edição para exercícios customizados */}
          {isEditMode && isCustom && (
            <Button
              title="Excluir"
              variant="danger"
              icon={<Trash2 size={18} color={colors.onError} strokeWidth={2} />}
              onPress={handleConfirmDelete}
              disabled={isSaving}
              style={styles.deleteBtn}
            />
          )}

          {/* Botão primário coral */}
          <Button
            title={isEditMode ? 'Salvar alterações' : 'Salvar exercício'}
            variant="primary"
            icon={!isSaving ? <Check size={20} color={colors.onPrimary} strokeWidth={2.2} /> : undefined}
            loading={isSaving}
            disabled={isSaving}
            onPress={handleSave}
            style={styles.saveBtn}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Sheet: Seleção de Equipamento */}
      <EquipmentPickerSheet
        visible={equipmentPickerVisible}
        mode="select"
        selectedEquipment={equipment}
        onSelect={(eq) => {
          if (eq !== 'Todos') {
            setEquipment(eq);
          }
        }}
        onClose={() => setEquipmentPickerVisible(false)}
      />

      {/* Sheet: Seleção do Músculo Principal */}
      <MusclePickerSheet
        visible={musclePickerVisible}
        mode="single"
        selectedValue={primaryMuscle}
        onApply={(muscle: Muscle) => {
          setPrimaryMuscle(muscle);
          // Ao trocar o principal, remove-o automaticamente dos secundários se estava presente
          setSecondaryMuscles((prev) =>
            prev.filter((m) => normalizeMuscleName(m) !== normalizeMuscleName(muscle))
          );
        }}
        onClose={() => setMusclePickerVisible(false)}
      />

      {/* Sheet: Seleção de Músculos Secundários */}
      <MusclePickerSheet
        visible={secondaryPickerVisible}
        mode="multi"
        selectedValue={secondaryMuscles}
        lockedMuscle={primaryMuscle}
        onApply={(muscles: string[]) => {
          setSecondaryMuscles(muscles);
        }}
        onClose={() => setSecondaryPickerVisible(false)}
      />

      {/* Modal de Descarte de Alterações */}
      <ConfirmModal
        visible={showDiscardModal}
        title={isEditMode ? 'Descartar alterações?' : 'Descartar exercício?'}
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

      {/* Modal de Exclusão de Exercício Customizado */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Excluir exercício?"
        description="Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteModal(false)}
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
    paddingHorizontal: spacing.margin, // 20px
    paddingTop: spacing.xs,
    gap: spacing.lg,
  },
  fieldBlock: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    padding: 3,
    gap: 4,
  },
  segmentOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentOptionSelected: {
    backgroundColor: colors.primary, // #FF7A59
  },
  segmentText: {
    fontSize: 14,
    fontFamily: fontFamilies.dmSansMedium,
  },
  segmentTextSelected: {
    color: colors.onPrimary, // #1A1715
    fontWeight: '600',
  },
  segmentTextUnselected: {
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  classificationContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    overflow: 'hidden',
  },
  classificationRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 12,
  },
  rowIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  rowLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  rowValue: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface, // #F5EFE8
  },
  emptySecondaryText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.textMuted, // #7D746B
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chipTag: {
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
  },
  chipTagText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant, // #3A3531
    marginLeft: 56,
  },
  textareaContainer: {
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    padding: 14,
    minHeight: 100,
  },
  textareaFocused: {
    borderColor: colors.primary, // #FF7A59
  },
  textareaInput: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fontFamilies.dmSansRegular,
    color: colors.onSurface,
    minHeight: 64,
    padding: 0,
  },
  counterText: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background, // #1A1715
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.margin, // 20px
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    minWidth: 105,
    paddingHorizontal: 16,
  },
  saveBtn: {
    flex: 1,
  },
  chipTagMore: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 6,
  },
  chipTagMoreText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fontFamilies.outfitSemiBold,
    fontVariant: ['tabular-nums'],
    color: colors.primary,
  },
});
