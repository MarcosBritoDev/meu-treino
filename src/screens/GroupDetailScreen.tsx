import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MoreVertical,
  Dumbbell,
  RefreshCw,
  Edit2,
  Plus,
  Play,
  History,
  Copy,
  Trash2,
  FolderInput,
  ArrowUp,
  ArrowDown,
  Check,
  List,
  Repeat,
  Clock,
  PlusCircle,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  ScreenHeader,
  Text,
  Button,
  ConfirmModal,
  Toast,
  TextField,
  BottomSheet,
  EditGroupSheet,
  triggerHaptic,
} from '../ui';
import {
  getGroupDetail,
  setActiveGroup,
  duplicateGroup,
  deleteGroup,
  updateWorkoutGroup,
  getExistingGroupNames,
  addWorkoutToGroup,
  duplicateWorkout,
  deleteWorkout,
  moveWorkoutToGroup,
  reorderWorkout,
  getInProgressSession,
  discardInProgressSession,
  startWorkoutSession,
  GroupDetailResult,
  GroupDetailWorkoutItem,
  InProgressSessionInfo,
} from '../db/workouts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GroupDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'GroupDetail'>>();
  const groupId = route.params?.groupId;

  const [data, setData] = useState<GroupDetailResult | null>(null);

  // Modais de Grupo
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [deleteGroupModalVisible, setDeleteGroupModalVisible] = useState(false);
  const [editGroupSheetVisible, setEditGroupSheetVisible] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupFreq, setEditGroupFreq] = useState('6');

  // Modais de Treino
  const [newWorkoutModalVisible, setNewWorkoutModalVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');

  const [selectedWorkout, setSelectedWorkout] = useState<GroupDetailWorkoutItem | null>(null);
  const [workoutMenuVisible, setWorkoutMenuVisible] = useState(false);
  const [deleteWorkoutModalVisible, setDeleteWorkoutModalVisible] = useState(false);
  const [moveWorkoutModalVisible, setMoveWorkoutModalVisible] = useState(false);

  // Conflito de sessão em andamento
  const [conflictSession, setConflictSession] = useState<InProgressSessionInfo | null>(null);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [pendingWorkoutToStart, setPendingWorkoutToStart] = useState<GroupDetailWorkoutItem | null>(null);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega dados do grupo
  const loadGroup = useCallback(() => {
    if (!groupId) return;
    try {
      const result = getGroupDetail(groupId);
      setData(result);
      if (result) {
        setEditGroupName(result.group.name);
        setEditGroupDesc(result.group.description || '');
        setEditGroupFreq(String(result.group.frequencyDays || 6));
      }
    } catch (err) {
      console.warn('Erro ao carregar detalhes do grupo:', err);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [loadGroup])
  );

  if (!groupId || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Grupo" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundContainer}>
          <Text variant="bodyLarge" color="secondary">
            Grupo não encontrado ou foi removido.
          </Text>
          <Button
            title="Voltar para treinos"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.notFoundButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { group, workouts, otherGroups } = data;

  // Ações do Grupo
  const handleSaveEditGroup = (formData: {
    name: string;
    description?: string;
    frequencyDays: number;
  }) => {
    try {
      updateWorkoutGroup(
        group.id,
        formData.name,
        formData.description,
        formData.frequencyDays
      );
      triggerHaptic('success');
      setEditGroupSheetVisible(false);
      loadGroup();
      setToastMessage('Grupo atualizado com sucesso');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao atualizar grupo:', err);
    }
  };

  const handleSetActive = () => {
    try {
      setActiveGroup(group.id);
      triggerHaptic('success');
      setGroupMenuVisible(false);
      loadGroup();
      setToastMessage(`"${group.name}" definido como grupo ativo`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao ativar grupo:', err);
    }
  };

  const handleDuplicateGroup = () => {
    try {
      duplicateGroup(group.id);
      triggerHaptic('medium');
      setGroupMenuVisible(false);
      setToastMessage(`Grupo "${group.name}" duplicado com sucesso`);
      setToastVisible(true);
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao duplicar grupo:', err);
    }
  };

  const handleConfirmDeleteGroup = () => {
    try {
      deleteGroup(group.id);
      triggerHaptic('medium');
      setDeleteGroupModalVisible(false);
      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao excluir grupo:', err);
    }
  };

  // Ações de Treino
  const handleCreateWorkout = () => {
    if (!newWorkoutName.trim()) return;
    try {
      const newWorkoutId = addWorkoutToGroup(group.id, newWorkoutName.trim());
      triggerHaptic('success');
      setNewWorkoutModalVisible(false);
      setNewWorkoutName('');
      loadGroup();
      setToastMessage('Treino adicionado ao grupo');
      setToastVisible(true);
      navigation.navigate('EditWorkout', { workoutId: newWorkoutId });
    } catch (err) {
      console.warn('Erro ao adicionar treino:', err);
    }
  };

  const handleDuplicateWorkout = (w: GroupDetailWorkoutItem) => {
    try {
      duplicateWorkout(w.id);
      triggerHaptic('medium');
      setWorkoutMenuVisible(false);
      loadGroup();
      setToastMessage(`Treino "${w.name}" duplicado`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao duplicar treino:', err);
    }
  };

  const handleConfirmDeleteWorkout = () => {
    if (!selectedWorkout) return;
    try {
      deleteWorkout(selectedWorkout.id);
      triggerHaptic('medium');
      setDeleteWorkoutModalVisible(false);
      loadGroup();
      setToastMessage(`Treino "${selectedWorkout.name}" excluído`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao excluir treino:', err);
    }
  };

  const handleMoveWorkout = (targetGroupId: string, targetGroupName: string) => {
    if (!selectedWorkout) return;
    try {
      moveWorkoutToGroup(selectedWorkout.id, targetGroupId);
      triggerHaptic('success');
      setMoveWorkoutModalVisible(false);
      loadGroup();
      setToastMessage(`Treino movido para "${targetGroupName}"`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao mover treino:', err);
    }
  };

  const handleReorder = (workoutId: string, direction: 'up' | 'down') => {
    try {
      reorderWorkout(workoutId, direction);
      triggerHaptic('selection');
      setWorkoutMenuVisible(false);
      loadGroup();
    } catch (err) {
      console.warn('Erro ao reordenar treino:', err);
    }
  };

  // Iniciar Treino
  const handleStartWorkout = (workout: GroupDetailWorkoutItem) => {
    triggerHaptic('medium');
    const existing = getInProgressSession();
    if (existing) {
      setConflictSession(existing);
      setPendingWorkoutToStart(workout);
      setConflictModalVisible(true);
      return;
    }

    const sessionId = startWorkoutSession(workout.id, workout.name);
    setToastMessage(`Treino "${workout.name}" iniciado`);
    setToastVisible(true);
    navigation.navigate('ActiveSession', { sessionId, workoutId: workout.id });
  };

  const handleContinueExistingSession = () => {
    if (!conflictSession) return;
    triggerHaptic('light');
    setConflictModalVisible(false);
    navigation.navigate('ActiveSession', {
      sessionId: conflictSession.id,
      workoutId: conflictSession.workoutId || undefined,
    });
  };

  const handleDiscardAndStartNew = () => {
    triggerHaptic('medium');
    discardInProgressSession();
    setConflictModalVisible(false);

    if (pendingWorkoutToStart) {
      const sessionId = startWorkoutSession(
        pendingWorkoutToStart.id,
        pendingWorkoutToStart.name
      );
      setToastMessage(`Treino "${pendingWorkoutToStart.name}" iniciado`);
      setToastVisible(true);
      navigation.navigate('ActiveSession', {
        sessionId,
        workoutId: pendingWorkoutToStart.id,
      });
    }
  };

  // Subtítulo estilizado do grupo (ex.: Push · Pull · Legs)
  const groupSubtitle = group.name === 'PPL'
    ? 'Push · Pull · Legs'
    : group.name === 'Upper / Lower'
    ? 'Superior · Inferior'
    : group.name === 'Fullbody 3x'
    ? 'Corpo inteiro'
    : group.frequencyText;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho padrão: voltar, título "Grupo" e menu (...) */}
      <ScreenHeader
        title="Grupo"
        onBack={() => navigation.goBack()}
        rightAction={
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setGroupMenuVisible(true);
            }}
            style={styles.iconButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Opções do grupo"
          >
            <MoreVertical size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloco de Identidade do Grupo */}
        <View style={styles.identitySection}>
          {/* Linha de Chips do Topo */}
          <View style={styles.topChipsRow}>
            <View style={styles.metaChip}>
              <Dumbbell size={14} color={colors.primary} strokeWidth={1.75} />
              <Text variant="labelSmall" color="secondary">
                {`${workouts.length} ${workouts.length === 1 ? 'treino' : 'treinos'}`}
              </Text>
            </View>

            <View style={styles.metaChip}>
              <RefreshCw size={13} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              <Text variant="labelSmall" color="secondary">
                {group.frequencyText}
              </Text>
            </View>
          </View>

          {/* Título Principal & Ação Rápida de Edição */}
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text variant="displayLarge" style={styles.groupTitle}>
                {group.name}
              </Text>
              <Text variant="bodyLarge" style={styles.groupSubtitle}>
                {groupSubtitle}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setEditGroupSheetVisible(true);
              }}
              style={styles.editGroupButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Editar grupo"
            >
              <Edit2 size={16} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              <Text variant="labelSmall" style={styles.editGroupButtonText}>
                Editar
              </Text>
            </Pressable>
          </View>

          {/* Descrição Estratégica */}
          {group.description ? (
            <Text variant="bodyMedium" color="secondary" style={styles.groupDescription}>
              {group.description}
            </Text>
          ) : null}
        </View>

        {/* Cabeçalho da Lista de Treinos */}
        <View style={styles.workoutsHeaderSection}>
          <View style={styles.workoutsTitleLeft}>
            <Text variant="headline" style={styles.workoutsTitle}>
              Treinos do grupo
            </Text>
            <View style={styles.primaryDot} />
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              setNewWorkoutModalVisible(true);
            }}
            style={styles.newWorkoutPill}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Novo treino"
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.2} />
            <Text variant="labelSmall" style={styles.newWorkoutPillText}>
              Novo treino
            </Text>
          </Pressable>
        </View>

        {/* Cards de Treino Empilhados */}
        <View style={styles.workoutsStack}>
          {workouts.map((w, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === workouts.length - 1;

            return (
              <View
                key={w.id}
                style={[
                  styles.workoutCard,
                  w.isScheduledForToday && styles.workoutCardScheduled,
                ]}
              >
                {/* Linha superior de destaque quando programado para hoje */}
                {w.isScheduledForToday && <View style={styles.scheduledAccentBar} />}

                {/* Topo do Card */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardBadgesLeft}>
                    {/* Rotina em sentence case: ex.: Rotina A-1 */}
                    <View style={styles.routineBadge}>
                      <Text variant="labelSmall" style={styles.routineBadgeText}>
                        {w.code}
                      </Text>
                    </View>

                    {/* Selo: Programado para hoje ou Último log */}
                    {w.isScheduledForToday ? (
                      <View style={styles.scheduledBadge}>
                        <View style={styles.scheduledPulseDot} />
                        <Text variant="labelSmall" style={styles.scheduledBadgeText}>
                          Programado para hoje
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.logBadge}>
                        <History size={13} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                        <Text variant="labelSmall" color="secondary">
                          {w.lastLogText}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Menu (...) da ficha de treino */}
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedWorkout(w);
                      setWorkoutMenuVisible(true);
                    }}
                    style={styles.cardMenuButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Opções de ${w.name}`}
                  >
                    <MoreVertical size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                  </Pressable>
                </View>

                {/* Nome & Músculos Alvo */}
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    navigation.navigate('EditWorkout', { workoutId: w.id });
                  }}
                  style={styles.workoutNameBlock}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir prévia de ${w.name}`}
                >
                  <Text variant="bodyLarge" style={styles.workoutCardTitle}>
                    {w.name}
                  </Text>
                  <Text variant="labelSmall" color="secondary" style={styles.workoutMusclesText}>
                    {`(${w.targetMuscles})`}
                  </Text>
                </Pressable>

                {/* Lista resumida de exercícios (ex: "Supino Reto — A + 5 séries") */}
                {w.exercises && w.exercises.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('EditWorkout', { workoutId: w.id });
                    }}
                    style={styles.loadSequenceContainer}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver exercícios de ${w.name}`}
                  >
                    <View style={styles.exerciseSummaryList}>
                      {w.exercises.slice(0, 3).map((ex, exIdx) => (
                        <Text key={`ex-${exIdx}`} variant="bodySmall" color="secondary" style={styles.exerciseSummaryText} numberOfLines={1}>
                          {ex.itemText}
                        </Text>
                      ))}
                      {w.exercises.length > 3 && (
                        <Text variant="labelSmall" color="secondary" style={styles.extraExerciseCountText}>
                          {`+${w.exercises.length - 3} ${w.exercises.length - 3 === 1 ? 'exercício' : 'exercícios'}`}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ) : w.exerciseChips.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('EditWorkout', { workoutId: w.id });
                    }}
                    style={styles.loadSequenceContainer}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver exercícios de ${w.name}`}
                  >
                    <View style={styles.loadChipsRow}>
                      {w.exerciseChips.map((exName, exIdx) => (
                        <View key={`chip-${exIdx}`} style={styles.exerciseChip}>
                          <Text variant="labelSmall" style={styles.exerciseChipText}>
                            {exName}
                          </Text>
                        </View>
                      ))}

                      {w.extraExerciseCount > 0 && (
                        <View style={styles.extraChip}>
                          <Text variant="labelSmall" style={styles.extraChipText}>
                            {`+${w.extraExerciseCount} ${w.extraExerciseCount === 1 ? 'exercício' : 'exercícios'}`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ) : null}

                {/* Resumo do treino: "N séries · ~X min" */}
                <View style={styles.metricsBar}>
                  <View style={styles.metricItem}>
                    <Repeat size={14} color={colors.primary} strokeWidth={1.75} />
                    <Text variant="labelSmall" style={styles.workoutSummaryBold}>
                      {w.summaryText || `${w.totalSets} ${w.totalSets === 1 ? 'série' : 'séries'} · ~${w.estimatedDurationMin} min`}
                    </Text>
                  </View>
                  {w.exerciseCount > 0 && (
                    <>
                      <Text variant="labelSmall" color="secondary">
                        ·
                      </Text>
                      <View style={styles.metricItem}>
                        <List size={14} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                        <Text variant="labelSmall" color="secondary">
                          {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'}`}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Rodapé do Card com Ações */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    onPress={() => handleStartWorkout(w)}
                    style={styles.startWorkoutButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Iniciar treino ${w.name}`}
                  >
                    <Play size={18} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                    <Text variant="bodyMedium" style={styles.startWorkoutText}>
                      Iniciar treino
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('EditWorkout', { workoutId: w.id });
                    }}
                    style={styles.editWorkoutPencil}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${w.name}`}
                  >
                    <Edit2 size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Botão de Rodapé: Adicionar outro treino a este grupo */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setNewWorkoutModalVisible(true);
          }}
          style={styles.footerAddWorkoutButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Adicionar outro treino a este grupo"
        >
          <PlusCircle size={20} color={colors.primary} strokeWidth={2} />
          <Text variant="bodyMedium" style={styles.footerAddWorkoutText}>
            {workouts.length === 0 ? 'Adicionar treino ao grupo' : 'Adicionar outro treino a este grupo'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Modal de Opções do Grupo (…) */}
      <Modal
        visible={groupMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setGroupMenuVisible(false)}>
          <View style={styles.menuCard}>
            {!group.isActive && (
              <>
                <Pressable
                  onPress={handleSetActive}
                  style={styles.menuItem}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Check size={18} color={colors.primary} strokeWidth={2} />
                  <Text variant="bodyMedium" style={styles.menuItemText}>
                    Definir como grupo ativo
                  </Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            )}

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setGroupMenuVisible(false);
                setEditGroupSheetVisible(true);
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Edit2 size={18} color={colors.onSurface} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemText}>
                Editar grupo
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={handleDuplicateGroup}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Copy size={18} color={colors.onSurface} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemText}>
                Duplicar grupo
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setGroupMenuVisible(false);
                setDeleteGroupModalVisible(true);
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Trash2 size={18} color={colors.error} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemDangerText}>
                Excluir grupo
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Opções de Treino Específico (…) */}
      <Modal
        visible={workoutMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkoutMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setWorkoutMenuVisible(false)}>
          <View style={styles.menuCard}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setWorkoutMenuVisible(false);
                if (selectedWorkout) {
                  navigation.navigate('EditWorkout', { workoutId: selectedWorkout.id });
                }
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Edit2 size={18} color={colors.onSurface} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemText}>
                Editar treino
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => {
                if (selectedWorkout) handleDuplicateWorkout(selectedWorkout);
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Copy size={18} color={colors.onSurface} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemText}>
                Duplicar treino
              </Text>
            </Pressable>

            {otherGroups.length > 0 && (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    setWorkoutMenuVisible(false);
                    setMoveWorkoutModalVisible(true);
                  }}
                  style={styles.menuItem}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <FolderInput size={18} color={colors.onSurface} strokeWidth={1.75} />
                  <Text variant="bodyMedium" style={styles.menuItemText}>
                    Mover para outro grupo
                  </Text>
                </Pressable>
              </>
            )}

            {/* Opções de Reordenar */}
            {selectedWorkout && (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  onPress={() => handleReorder(selectedWorkout.id, 'up')}
                  style={styles.menuItem}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <ArrowUp size={18} color={colors.onSurface} strokeWidth={1.75} />
                  <Text variant="bodyMedium" style={styles.menuItemText}>
                    Mover para cima
                  </Text>
                </Pressable>
                <View style={styles.menuDivider} />
                <Pressable
                  onPress={() => handleReorder(selectedWorkout.id, 'down')}
                  style={styles.menuItem}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <ArrowDown size={18} color={colors.onSurface} strokeWidth={1.75} />
                  <Text variant="bodyMedium" style={styles.menuItemText}>
                    Mover para baixo
                  </Text>
                </Pressable>
              </>
            )}

            <View style={styles.menuDivider} />

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setWorkoutMenuVisible(false);
                setDeleteWorkoutModalVisible(true);
              }}
              style={styles.menuItem}
              accessible={true}
              accessibilityRole="button"
            >
              <Trash2 size={18} color={colors.error} strokeWidth={1.75} />
              <Text variant="bodyMedium" style={styles.menuItemDangerText}>
                Excluir treino
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Sheet para Editar Grupo (3.4) */}
      <EditGroupSheet
        visible={editGroupSheetVisible}
        mode="edit"
        initialData={{
          id: group.id,
          name: group.name,
          description: group.description,
          frequencyDays: group.frequencyDays,
        }}
        existingGroupNames={getExistingGroupNames(group.id)}
        onClose={() => setEditGroupSheetVisible(false)}
        onSave={handleSaveEditGroup}
        onDelete={() => {
          setEditGroupSheetVisible(false);
          handleConfirmDeleteGroup();
        }}
      />

      {/* Sheet para Adicionar Treino ao Grupo */}
      <BottomSheet
        visible={newWorkoutModalVisible}
        onClose={() => setNewWorkoutModalVisible(false)}
        title="Adicionar treino ao grupo"
      >
        <View style={styles.bottomSheetForm}>
          <TextField
            label="Nome da ficha de treino *"
            placeholder="Ex.: Push A, Peito e tríceps, Treino B"
            value={newWorkoutName}
            onChangeText={setNewWorkoutName}
            maxLength={40}
          />

          <View style={styles.formButtonRow}>
            <Button
              title="Adicionar treino"
              variant="primary"
              disabled={!newWorkoutName.trim()}
              onPress={handleCreateWorkout}
              style={styles.fullWidthButton}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Modal para Mover Treino de Grupo */}
      <BottomSheet
        visible={moveWorkoutModalVisible}
        onClose={() => setMoveWorkoutModalVisible(false)}
        title="Mover para outro grupo"
      >
        <View style={styles.bottomSheetForm}>
          <Text variant="bodySmall" color="secondary" style={styles.sheetSub}>
            Escolha o novo grupo de destino para esta ficha:
          </Text>

          <View style={styles.otherGroupsList}>
            {otherGroups.map((og) => (
              <Pressable
                key={og.id}
                onPress={() => handleMoveWorkout(og.id, og.name)}
                style={styles.otherGroupItem}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Mover para ${og.name}`}
              >
                <Dumbbell size={18} color={colors.primary} strokeWidth={1.75} />
                <Text variant="bodyMedium" style={styles.otherGroupName}>
                  {og.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>

      {/* ConfirmModal para Exclusão de Grupo */}
      <ConfirmModal
        visible={deleteGroupModalVisible}
        title="Excluir grupo?"
        description={`O grupo "${group.name}" e todas as suas fichas serão excluídos. Sessões passadas já registradas permanecerão intactas.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setDeleteGroupModalVisible(false)}
      />

      {/* ConfirmModal para Exclusão de Treino */}
      <ConfirmModal
        visible={deleteWorkoutModalVisible}
        title="Excluir treino?"
        description={`O treino "${selectedWorkout?.name}" será removido deste grupo. O histórico já registrado continuará salvo.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmDeleteWorkout}
        onCancel={() => setDeleteWorkoutModalVisible(false)}
      />

      {/* ConfirmModal para Conflito de Sessão em Andamento */}
      <ConfirmModal
        visible={conflictModalVisible}
        title="Treino em andamento"
        description={`Você já tem um treino em andamento ("${conflictSession?.nameSnapshot}"). Deseja continuar o treino atual ou descartá-lo para começar outro?`}
        confirmLabel="Descartar e iniciar novo"
        cancelLabel="Continuar treino atual"
        isDanger={true}
        onConfirm={handleDiscardAndStartNew}
        onCancel={handleContinueExistingSession}
      />

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onDismiss={() => setToastVisible(false)}
      />
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 1.5,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.margin,
  },
  notFoundButton: {
    marginTop: spacing.md,
  },
  iconButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Identidade do Grupo
  identitySection: {
    marginBottom: spacing.lg,
  },
  topChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  titleTextContainer: {
    flex: 1,
  },
  groupTitle: {
    color: colors.onSurface,
    lineHeight: 52,
  },
  groupSubtitle: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  editGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 4,
  },
  editGroupButtonText: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  groupDescription: {
    marginTop: 6,
    lineHeight: 22,
  },

  // Seção de Treinos
  workoutsHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  workoutsTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutsTitle: {
    color: colors.onSurface,
    fontSize: 18,
  },
  primaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  newWorkoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  newWorkoutPillText: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Cards de Treino
  workoutsStack: {
    gap: spacing.md,
  },
  workoutCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    position: 'relative',
    overflow: 'hidden',
  },
  workoutCardScheduled: {
    borderColor: 'rgba(255, 122, 89, 0.45)',
  },
  scheduledAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardBadgesLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  routineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHighest,
  },
  routineBadgeText: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 122, 89, 0.16)',
  },
  scheduledPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  scheduledBadgeText: {
    color: colors.primary,
    fontWeight: '700',
  },
  logBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMenuButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nome e Músculos
  workoutNameBlock: {
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  workoutCardTitle: {
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 22,
  },
  workoutMusclesText: {
    marginTop: 2,
    fontSize: 12,
  },

  // Sequência de Carga
  loadSequenceContainer: {
    marginBottom: spacing.sm,
    gap: 6,
  },
  loadSequenceLabel: {
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  exerciseSummaryList: {
    gap: 4,
  },
  exerciseSummaryText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  extraExerciseCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  loadChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  exerciseChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHighest,
  },
  exerciseChipText: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  extraChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
  },
  extraChipText: {
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Barra de Métricas
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutSummaryBold: {
    fontWeight: '700',
    color: colors.onSurface,
  },

  // Ações do Card
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startWorkoutButton: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  startWorkoutText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  editWorkoutPencil: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Rodapé Adicionar Treino
  footerAddWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  footerAddWorkoutText: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.margin,
  },
  menuCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  menuItemText: {
    color: colors.onSurface,
  },
  menuItemDangerText: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },

  // BottomSheet forms
  bottomSheetForm: {
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.lg,
  },
  formFieldSpacing: {
    marginTop: spacing.md,
  },
  formButtonRow: {
    marginTop: spacing.lg,
  },
  fullWidthButton: {
    width: '100%',
  },
  sheetSub: {
    marginBottom: spacing.md,
  },
  otherGroupsList: {
    gap: spacing.xs,
  },
  otherGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
  },
  otherGroupName: {
    color: colors.onSurface,
  },
});
