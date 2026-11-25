import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Edit2,
  Plus,
  Trash2,
  Check,
  Clock,
  ArrowUp,
  ArrowDown,
  GripVertical,
  X,
  CheckCircle,
  Sliders,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Toast } from '../ui/Toast';
import { ExerciseTargetSheet } from '../ui/ExerciseTargetSheet';
import { triggerHaptic } from '../ui/haptics';
import { estimarDuracao, formatarDuracao } from '../domain/duration';
import {
  getWorkoutForEdit,
  saveWorkout,
  WorkoutForEdit,
  WorkoutExerciseForEdit,
} from '../db/workouts';

type RouteParams = RouteProp<RootStackParamList, 'EditWorkout'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REST_CHIPS = [60, 90, 120, 180] as const;

export const EditWorkoutScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const workoutId = route.params?.workoutId;

  const [data, setData] = useState<WorkoutForEdit | null>(null);

  // Estados de Rascunho Local
  const [name, setName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<WorkoutExerciseForEdit[]>([]);

  // Estados Iniciais para comparação de alterações (Dirty State)
  const [initialState, setInitialState] = useState<{
    name: string;
    groupId: string | null;
    isActive: boolean;
    exercisesJson: string;
  } | null>(null);

  // Modal de descarte de alterações
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  // Sheet 3.6: Alvo do Exercício
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [targetSets, setTargetSets] = useState(3);
  const [targetRepMin, setTargetRepMin] = useState(8);
  const [targetRepMax, setTargetRepMax] = useState(12);
  const [targetRestS, setTargetRestS] = useState(90);

  // Toast de Feedback
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega dados da ficha
  const loadWorkout = useCallback(() => {
    if (!workoutId) return;
    try {
      const result = getWorkoutForEdit(workoutId);
      if (result) {
        setData(result);
        setName(result.name);
        setSelectedGroupId(result.groupId);
        setIsActive(result.isActive);
        setExercises(result.exercises);

        setInitialState({
          name: result.name,
          groupId: result.groupId,
          isActive: result.isActive,
          exercisesJson: JSON.stringify(
            result.exercises.map((e) => ({
              id: e.exerciseId,
              s: e.targetSets,
              min: e.repMin,
              max: e.repMax,
              r: e.restS,
            }))
          ),
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar treino para edição:', err);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Recebe exercícios selecionados na tela modal 3.7 Adicionar exercícios
  useEffect(() => {
    const newItems = route.params?.addedExercises;
    if (newItems && newItems.length > 0) {
      setExercises((prev) => {
        const nextPos = prev.length;
        const mapped: WorkoutExerciseForEdit[] = newItems.map((item, idx) => ({
          id: `new_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          exerciseId: item.exerciseId,
          name: item.name,
          muscleGroup: item.muscleGroup,
          equipment: item.equipment,
          position: nextPos + idx,
          targetSets: 3,
          repMin: 8,
          repMax: 12,
          restS: item.defaultRestS || 90,
          note: null,
        }));
        return [...prev, ...mapped];
      });
      triggerHaptic('success');
      setToastMessage(
        newItems.length === 1
          ? '1 exercício adicionado'
          : `${newItems.length} exercícios adicionados`
      );
      setToastVisible(true);
      navigation.setParams({ addedExercises: undefined });
    }
  }, [route.params?.addedExercises, navigation]);

  // Verifica se há alterações pendentes
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    const currentExercisesJson = JSON.stringify(
      exercises.map((e) => ({
        id: e.exerciseId,
        s: e.targetSets,
        min: e.repMin,
        max: e.repMax,
        r: e.restS,
      }))
    );

    return (
      name.trim() !== initialState.name.trim() ||
      selectedGroupId !== initialState.groupId ||
      isActive !== initialState.isActive ||
      currentExercisesJson !== initialState.exercisesJson
    );
  }, [name, selectedGroupId, isActive, exercises, initialState]);

  // Voltar com verificação de rascunho
  const handleBack = () => {
    if (isDirty) {
      triggerHaptic('warning');
      setDiscardModalVisible(true);
    } else {
      triggerHaptic('light');
      navigation.goBack();
    }
  };

  // Reordenação de exercícios
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    triggerHaptic('selection');
    setExercises((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    triggerHaptic('selection');
    setExercises((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // Remover exercício da lista
  const handleRemoveExercise = (index: number) => {
    triggerHaptic('medium');
    setExercises((prev) => prev.filter((_, i) => i !== index));
    if (targetIndex === index) {
      setTargetModalVisible(false);
      setTargetIndex(null);
    }
  };

  // Abrir Sheet 3.6 de Alvo do Exercício
  const handleOpenTargetSheet = (index: number) => {
    const ex = exercises[index];
    if (!ex) return;
    triggerHaptic('light');
    setTargetIndex(index);
    setTargetSets(ex.targetSets);
    setTargetRepMin(ex.repMin);
    setTargetRepMax(ex.repMax);
    setTargetRestS(ex.restS);
    setTargetModalVisible(true);
  };

  // Salvar ficha completa
  const handleSave = () => {
    if (!workoutId || !name.trim()) {
      triggerHaptic('error');
      return;
    }
    try {
      saveWorkout(workoutId, {
        name: name.trim(),
        groupId: selectedGroupId,
        isActive,
        exercises,
      });
      triggerHaptic('success');
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao salvar treino:', err);
    }
  };

  // Cálculos dinâmicos de resumo (Volume e Duração Estimada)
  const totalVolumeSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + (Number(ex.targetSets) || 0), 0);
  }, [exercises]);

  const estimatedDurationText = useMemo(() => {
    const totalSecs = estimarDuracao({
      exercises: exercises.map((e) => ({
        targetSets: e.targetSets,
        restS: e.restS,
      })),
    });
    return formatarDuracao(totalSecs);
  }, [exercises]);

  if (!workoutId || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
          </Pressable>
          <Text variant="headline" style={styles.headerTitle}>
            Editar treino
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" color="secondary">
            Treino não encontrado.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Lista de grupos para chips de divisão
  const groupChips = [
    ...data.allGroups.map((g) => ({ id: g.id, name: g.name })),
    { id: null, name: 'Personalizada' },
  ];

  const currentExerciseForTarget = targetIndex !== null ? exercises[targetIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO DA TELA */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={22} color={colors.onSurface} strokeWidth={2} />
          </Pressable>
          <Text variant="headline" style={styles.headerTitle}>
            Editar treino
          </Text>
        </View>

        {/* Indicador de Status / Switch Ativo */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setIsActive(!isActive);
          }}
          style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeArchived]}
          accessibilityRole="switch"
          accessibilityLabel={`Status do treino: ${isActive ? 'Ativo' : 'Arquivado'}`}
        >
          <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotArchived]} />
          <Text
            variant="labelSmall"
            style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextArchived]}
          >
            {isActive ? 'Ativo' : 'Arquivado'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Linha do Código do Treino (ex.: Rotina A-1) */}
        <View style={styles.codeRow}>
          <Text variant="labelSmall" style={styles.codeText}>
            Rotina {data.code}
          </Text>
        </View>

        {/* CAMPO NOME DO TREINO */}
        <View style={styles.fieldSection}>
          <Text variant="labelSmall" style={styles.fieldLabel}>
            Nome do treino
          </Text>
          <View style={styles.nameInputBox}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              maxLength={40}
              placeholder="Ex: Push A"
              placeholderTextColor={colors.textMuted}
              accessible={true}
              accessibilityLabel="Nome da ficha de treino"
            />
            <Edit2 size={18} color={colors.onSurfaceVariant} strokeWidth={1.8} />
          </View>
        </View>

        {/* SEÇÃO DIVISÃO (OPCIONAL) */}
        <View style={styles.fieldSection}>
          <View style={styles.divisionHeader}>
            <Text variant="labelSmall" style={styles.fieldLabel}>
              Divisão (opcional)
            </Text>
            <Text variant="bodySmall" style={styles.currentDivisionName}>
              {selectedGroupId
                ? data.allGroups.find((g) => g.id === selectedGroupId)?.name || 'Personalizada'
                : 'Personalizada'}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.divisionScroll}
          >
            {groupChips.map((chip) => {
              const isSelected = selectedGroupId === chip.id;
              return (
                <Pressable
                  key={chip.name}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedGroupId(chip.id);
                  }}
                  style={[
                    styles.divisionChip,
                    isSelected && styles.divisionChipSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Divisão ${chip.name}`}
                >
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.divisionChipText,
                      isSelected && styles.divisionChipTextSelected,
                    ]}
                  >
                    {chip.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* SEÇÃO EXERCÍCIOS */}
        <View style={styles.fieldSection}>
          <View style={styles.exerciseSectionHeader}>
            <View style={styles.exerciseTitleRow}>
              <Text variant="headline" style={styles.exerciseSectionTitle}>
                Exercícios
              </Text>
              <View style={styles.exerciseCountPill}>
                <Text variant="labelSmall" style={styles.exerciseCountText}>
                  {exercises.length}
                </Text>
              </View>
            </View>

            <View style={styles.reorderHintRow}>
              <Sliders size={14} color={colors.onSurfaceVariant} strokeWidth={1.8} />
              <Text variant="bodySmall" style={styles.reorderHintText}>
                Arraste para reordenar
              </Text>
            </View>
          </View>

          {/* LISTA DE EXERCÍCIOS REORDENÁVEIS */}
          <View style={styles.exerciseList}>
            {exercises.map((ex, index) => {
              const formattedIndex = (index + 1).toString().padStart(2, '0');
              const isFirst = index === 0;
              const isLast = index === exercises.length - 1;

              return (
                <Pressable
                  key={`${ex.exerciseId}_${index}`}
                  onPress={() => handleOpenTargetSheet(index)}
                  style={({ pressed }) => [
                    styles.exerciseCard,
                    pressed && styles.exerciseCardPressed,
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${ex.name}, ${ex.targetSets} séries de ${ex.repMin} a ${ex.repMax} repetições. Toque para editar metas.`}
                >
                  <View style={styles.exerciseCardLeft}>
                    {/* Número ordinal */}
                    <Text variant="displayMedium" style={styles.ordinalNumber}>
                      {formattedIndex}
                    </Text>

                    {/* Informações do exercício */}
                    <View style={styles.exerciseInfo}>
                      <Text
                        variant="bodyMedium"
                        style={styles.exerciseNameText}
                        numberOfLines={1}
                      >
                        {ex.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.exerciseMetaText}>
                        {ex.targetSets} séries · {ex.repMin}-{ex.repMax} reps · {ex.restS}s
                      </Text>
                    </View>
                  </View>

                  {/* Ações de Reordenação e Alça */}
                  <View style={styles.exerciseCardRight}>
                    <View style={styles.reorderArrowsContainer}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMoveUp(index);
                        }}
                        disabled={isFirst}
                        style={[styles.arrowButton, isFirst && styles.arrowButtonDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Mover ${ex.name} para cima`}
                      >
                        <ArrowUp
                          size={14}
                          color={isFirst ? colors.textMuted : colors.onSurfaceVariant}
                          strokeWidth={2}
                        />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMoveDown(index);
                        }}
                        disabled={isLast}
                        style={[styles.arrowButton, isLast && styles.arrowButtonDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel={`Mover ${ex.name} para baixo`}
                      >
                        <ArrowDown
                          size={14}
                          color={isLast ? colors.textMuted : colors.onSurfaceVariant}
                          strokeWidth={2}
                        />
                      </Pressable>
                    </View>

                    {/* Alça visual de arrasto */}
                    <View style={styles.dragHandleIcon}>
                      <GripVertical size={18} color={colors.onSurfaceVariant} strokeWidth={1.8} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* BOTÃO ADICIONAR EXERCÍCIO */}
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              navigation.navigate('AddExercises', {
                workoutId,
                existingExerciseIds: exercises.map((e) => e.exerciseId),
              });
            }}
            style={({ pressed }) => [
              styles.addExerciseButton,
              pressed && styles.addExerciseButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar exercício ao treino"
          >
            <Plus size={20} color={colors.primary} strokeWidth={2.4} />
            <Text variant="bodyMedium" style={styles.addExerciseButtonText}>
              Adicionar exercício
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 2. RODAPÉ FIXO COM RESUMO E SALVAR */}
      <View style={styles.stickyBottomBar}>
        <View style={styles.stickyMetricsContainer}>
          <View style={styles.volumeRow}>
            <Text variant="bodySmall" style={styles.metricLabel}>
              Volume
            </Text>
            <Text variant="headline" style={styles.volumeValue}>
              {totalVolumeSets} séries
            </Text>
          </View>
          <View style={styles.durationRow}>
            <Clock size={13} color={colors.onSurfaceVariant} strokeWidth={2} />
            <Text variant="bodySmall" style={styles.durationValue}>
              Tempo est. ~{estimatedDurationText}
            </Text>
          </View>
        </View>

        {/* Botão Salvar Treino (Coral, não âmbar!) */}
        <Pressable
          onPress={handleSave}
          disabled={!name.trim()}
          style={({ pressed }) => [
            styles.saveButton,
            !name.trim() && styles.saveButtonDisabled,
            pressed && styles.saveButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Salvar treino"
        >
          <Check size={18} color={name.trim() ? colors.onPrimary : colors.textMuted} strokeWidth={2.6} />
          <Text
            variant="bodyMedium"
            style={[
              styles.saveButtonText,
              !name.trim() && styles.saveButtonTextDisabled,
            ]}
          >
            Salvar treino
          </Text>
        </Pressable>
      </View>

      {/* 3. SHEET 3.6: ALVO DO EXERCÍCIO */}
      <ExerciseTargetSheet
        visible={targetModalVisible}
        exerciseName={currentExerciseForTarget?.name || ''}
        initialSets={currentExerciseForTarget?.targetSets ?? 4}
        initialRepMin={currentExerciseForTarget?.repMin ?? 8}
        initialRepMax={currentExerciseForTarget?.repMax ?? 10}
        initialRestS={currentExerciseForTarget?.restS ?? 90}
        onClose={() => {
          setTargetModalVisible(false);
          setTargetIndex(null);
        }}
        onApply={(targets) => {
          if (targetIndex === null || !exercises[targetIndex]) return;
          triggerHaptic('success');
          setExercises((prev) => {
            const updated = [...prev];
            updated[targetIndex] = {
              ...updated[targetIndex],
              targetSets: targets.targetSets,
              repMin: targets.repMin,
              repMax: targets.repMax,
              restS: targets.restS,
            };
            return updated;
          });
          setTargetModalVisible(false);
          setTargetIndex(null);
        }}
        onRemove={() => {
          if (targetIndex !== null) {
            handleRemoveExercise(targetIndex);
            setTargetModalVisible(false);
            setTargetIndex(null);
          }
        }}
      />

      {/* 4. MODAL DE CONFIRMAÇÃO DE DESCARTE DE ALTERAÇÕES */}
      <ConfirmModal
        visible={discardModalVisible}
        title="Descartar alterações?"
        description="As alterações não salvas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        isDanger={true}
        onConfirm={() => {
          setDiscardModalVisible(false);
          triggerHaptic('light');
          navigation.goBack();
        }}
        onCancel={() => setDiscardModalVisible(false)}
      />

      {/* Toast Feedback */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #1A1715
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.25)',
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(123, 201, 143, 0.12)',
    borderColor: 'rgba(123, 201, 143, 0.3)',
  },
  statusBadgeArchived: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotArchived: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextArchived: {
    color: colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Espaço para a barra fixa inferior
  },
  codeRow: {
    marginBottom: 12,
  },
  codeText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamilies.outfitSemiBold,
    letterSpacing: 0.5,
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  nameInputBox: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameInput: {
    flex: 1,
    fontFamily: fontFamilies.outfitBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  divisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  currentDivisionName: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  divisionScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  divisionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  divisionChipSelected: {
    backgroundColor: colors.primary,
  },
  divisionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  divisionChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  exerciseCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  exerciseCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  reorderHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderHintText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCardPressed: {
    backgroundColor: '#35302C',
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  ordinalNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 18,
    color: colors.primary,
    width: 26,
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseNameText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  exerciseMetaText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  exerciseCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  reorderArrowsContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  arrowButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
  },
  arrowButtonDisabled: {
    opacity: 0.3,
  },
  dragHandleIcon: {
    padding: 4,
  },
  addExerciseButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  addExerciseButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  addExerciseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  stickyMetricsContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  durationValue: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  saveButton: {
    backgroundColor: colors.primary, // CORAL
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  targetSheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  targetSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  targetHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  targetExerciseTitle: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 18,
    color: colors.onSurface,
  },
  targetSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBlock: {
    marginBottom: 16,
  },
  targetBlockLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  targetBlockTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  targetBlockDescription: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  stepperContainer: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  stepperValueText: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 26,
    color: colors.onSurface,
  },
  hypertrophyTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  repRangeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  repBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  repBoxLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  repStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  repStepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repStepperBtnText: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  repValue: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 22,
    color: colors.onSurface,
  },
  restChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restChipSelected: {
    backgroundColor: colors.primary,
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
  targetActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  applyTargetsButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyTargetsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  removeTargetButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeTargetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});
