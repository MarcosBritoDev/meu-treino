import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  MoreVertical,
  Dumbbell,
  RefreshCw,
  Edit2,
  Plus,
  Play,
  Copy,
  Trash2,
  FolderInput,
  ArrowUp,
  ArrowDown,
  Check,
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
  const insets = useSafeAreaInsets();
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
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Opções do grupo"
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          >
            <MoreVertical size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl * 1.5 },
        ]}
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
              <Text variant="headline" style={styles.groupTitle}>
                {group.name}
              </Text>
              <Text variant="bodyMedium" style={styles.groupSubtitle}>
                {groupSubtitle}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setEditGroupSheetVisible(true);
              }}
              style={({ pressed }) => [
                styles.editGroupButton,
                pressed && styles.editGroupButtonPressed,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Editar grupo"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            style={({ pressed }) => [
              styles.newWorkoutPill,
              pressed && styles.newWorkoutPillPressed,
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Novo treino"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.4} />
            <Text variant="labelSmall" style={styles.newWorkoutPillText}>
              Novo treino
            </Text>
          </Pressable>
        </View>

        {/* Cards de Treino Compactos no Padrão WorkoutsScreen */}
        <View style={styles.workoutsStack}>
          {workouts.map((w) => {
            return (
              <View key={w.id} style={styles.workoutItemCard}>
                {/* Área principal do item: tocar abre Prévia / Edição */}
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    navigation.navigate('EditWorkout', { workoutId: w.id });
                  }}
                  style={({ pressed }) => [
                    styles.workoutItemContent,
                    pressed && styles.workoutItemContentPressed,
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Ficha ${w.name}, ${w.targetMuscles}, ${w.exerciseCount} exercícios, ${w.totalSets} séries`}
                >
                  {/* Linha 1: Nome do treino + músculos-alvo */}
                  <View style={styles.workoutNameRow}>
                    <Text variant="bodyLarge" style={styles.workoutName} numberOfLines={1}>
                      {w.name}
                    </Text>
                    {w.targetMuscles ? (
                      <Text variant="bodySmall" color="secondary" style={styles.workoutMuscles} numberOfLines={1}>
                        {`• ${w.targetMuscles}`}
                      </Text>
                    ) : null}
                  </View>

                  {/* Linha 2: Resumo métrico tabular + indicador Programado para hoje */}
                  <View style={styles.workoutMetaRow}>
                    {w.isScheduledForToday ? (
                      <View style={styles.scheduledBadge}>
                        <View style={styles.scheduledPulseDot} />
                        <Text variant="labelSmall" style={styles.scheduledBadgeText}>
                          Hoje
                        </Text>
                      </View>
                    ) : null}
                    <Text variant="bodySmall" color="secondary" tabular style={styles.workoutStatsText} numberOfLines={1}>
                      {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'} · ${w.totalSets} ${w.totalSets === 1 ? 'série' : 'séries'} · ~${w.estimatedDurationMin} min`}
                    </Text>
                  </View>
                </Pressable>

                {/* Ações à direita: Iniciar + Menu (...) bem separados */}
                <View style={styles.workoutActionsRight}>
                  <Pressable
                    onPress={() => handleStartWorkout(w)}
                    style={({ pressed }) => [
                      styles.startWorkoutButton,
                      pressed && styles.startWorkoutButtonPressed,
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Iniciar treino ${w.name}`}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Play size={15} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                    <Text variant="labelSmall" style={styles.startWorkoutText}>
                      Iniciar
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedWorkout(w);
                      setWorkoutMenuVisible(true);
                    }}
                    style={({ pressed }) => [
                      styles.cardMenuButton,
                      pressed && styles.cardMenuButtonPressed,
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Opções de ${w.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                  >
                    <MoreVertical size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Botão de Rodapé: Adicionar treino */}
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setNewWorkoutModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.addWorkoutButton,
            pressed && styles.addWorkoutButtonPressed,
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Adicionar treino ao grupo"
        >
          <Plus size={18} color={colors.primary} strokeWidth={2.2} />
          <Text variant="bodyLarge" style={styles.addWorkoutButtonText}>
            Adicionar treino
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
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  groupSubtitle: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
    fontSize: 14,
  },
  editGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  editGroupButtonPressed: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  editGroupButtonText: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    fontSize: 13,
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
    gap: 5,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  newWorkoutPillPressed: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  newWorkoutPillText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  // Cards de Treino Compactos no Padrão WorkoutsScreen
  workoutsStack: {
    gap: spacing.sm,
  },
  workoutItemCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
  },
  workoutItemContent: {
    flex: 1,
    paddingRight: spacing.sm,
    justifyContent: 'center',
  },
  workoutItemContentPressed: {
    opacity: 0.75,
  },
  workoutNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  workoutName: {
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  workoutMuscles: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 122, 89, 0.16)',
    borderRadius: radii.pill,
  },
  scheduledPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  scheduledBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  workoutStatsText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  workoutActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  startWorkoutButtonPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.98 }],
  },
  startWorkoutText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  cardMenuButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMenuButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },

  // Rodapé Adicionar Treino
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.pill,
    minHeight: spacing.buttonHeight,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  addWorkoutButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  addWorkoutButtonText: {
    color: colors.onSurface,
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
