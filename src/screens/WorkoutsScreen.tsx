import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Settings,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit2,
  Play,
  Zap,
  Check,
  Trash2,
  Copy,
  Lightbulb,
  Sparkles,
  ArrowRight,
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
  EmptyWorkoutsIllustration,
  triggerHaptic,
} from '../ui';
import {
  getWorkoutGroupsSummary,
  setActiveGroup,
  duplicateGroup,
  deleteGroup,
  updateWorkoutGroup,
  seedDefaultPPLGroup,
  getInProgressSession,
  discardInProgressSession,
  startWorkoutSession,
  createWorkoutGroup,
  getExistingGroupNames,
  addWorkoutToGroup,
  WorkoutSummaryResult,
  WorkoutGroupDetail,
  WorkoutItemDetail,
  InProgressSessionInfo,
} from '../db/workouts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const WorkoutsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Estados principais
  const [data, setData] = useState<WorkoutSummaryResult>({
    totalGroups: 0,
    totalWorkouts: 0,
    groups: [],
  });
  const [loading, setLoading] = useState(true);

  // Grupos expandidos (armazena IDs dos grupos que estão com o acordeão aberto)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Menu de opções do grupo (…)
  const [selectedGroup, setSelectedGroup] = useState<WorkoutGroupDetail | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editGroupSheetVisible, setEditGroupSheetVisible] = useState(false);

  // Modais de criação rápida
  const [newGroupModalVisible, setNewGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreatingPPL, setIsCreatingPPL] = useState(false);

  const [newWorkoutModalVisible, setNewWorkoutModalVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [targetGroupIdForWorkout, setTargetGroupIdForWorkout] = useState<string | null>(null);

  // Conflito de sessão em andamento
  const [conflictSession, setConflictSession] = useState<InProgressSessionInfo | null>(null);
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [pendingWorkoutToStart, setPendingWorkoutToStart] = useState<WorkoutItemDetail | null>(null);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Carrega os dados reais do SQLite
  const loadData = useCallback(() => {
    try {
      const result = getWorkoutGroupsSummary();
      setData(result);

      // O grupo ativo vem aberto por padrão
      const activeGroup = result.groups.find((g) => g.isActive);
      if (activeGroup) {
        setExpandedGroupIds((prev) => {
          const next = new Set(prev);
          next.add(activeGroup.id);
          return next;
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar treinos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Alterna expansão de um grupo
  const toggleGroupExpand = (groupId: string) => {
    triggerHaptic('selection');
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Define um grupo como ativo
  const handleSetActiveGroup = (groupId: string, groupName: string) => {
    try {
      setActiveGroup(groupId);
      triggerHaptic('success');
      setMenuVisible(false);
      loadData();
      setToastMessage(`"${groupName}" definido como grupo ativo`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao ativar grupo:', err);
    }
  };

  // Duplica um grupo
  const handleDuplicateGroup = (group: WorkoutGroupDetail) => {
    try {
      duplicateGroup(group.id);
      triggerHaptic('medium');
      setMenuVisible(false);
      loadData();
      setToastMessage(`Grupo "${group.name}" duplicado com sucesso`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao duplicar grupo:', err);
    }
  };

  // Exclui um grupo
  const handleConfirmDelete = () => {
    if (!selectedGroup) return;
    try {
      deleteGroup(selectedGroup.id);
      triggerHaptic('medium');
      setDeleteModalVisible(false);
      loadData();
      setToastMessage(`Grupo "${selectedGroup.name}" excluído`);
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao excluir grupo:', err);
    }
  };

  // Salva edição de grupo
  const handleSaveEditGroup = (formData: {
    name: string;
    description?: string;
    frequencyDays: number;
  }) => {
    if (!selectedGroup) return;
    try {
      updateWorkoutGroup(
        selectedGroup.id,
        formData.name,
        formData.description,
        formData.frequencyDays
      );
      triggerHaptic('success');
      setEditGroupSheetVisible(false);
      loadData();
      setToastMessage('Grupo atualizado com sucesso');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao atualizar grupo:', err);
    }
  };

  // Aplica o preset PPL padrão (idempotente)
  const handleSeedDefaultPPL = () => {
    if (isCreatingPPL) return;
    setIsCreatingPPL(true);
    try {
      const groupId = seedDefaultPPLGroup();
      triggerHaptic('success');
      loadData();
      setToastMessage('Modelo PPL padrão criado com sucesso');
      setToastVisible(true);
      navigation.navigate('GroupDetail', { groupId });
    } catch (err) {
      console.warn('Erro ao criar modelo PPL:', err);
    } finally {
      setIsCreatingPPL(false);
    }
  };

  // Criação de novo grupo
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    try {
      createWorkoutGroup(newGroupName.trim(), newGroupDesc.trim() || undefined);
      triggerHaptic('success');
      setNewGroupModalVisible(false);
      setNewGroupName('');
      setNewGroupDesc('');
      loadData();
      setToastMessage('Grupo de treino criado com sucesso');
      setToastVisible(true);
    } catch (err) {
      console.warn('Erro ao criar grupo:', err);
    }
  };

  // Adição de treino ao grupo
  const handleAddWorkout = () => {
    if (!targetGroupIdForWorkout || !newWorkoutName.trim()) return;
    try {
      const newWorkoutId = addWorkoutToGroup(targetGroupIdForWorkout, newWorkoutName.trim());
      triggerHaptic('success');
      setNewWorkoutModalVisible(false);
      setNewWorkoutName('');
      setTargetGroupIdForWorkout(null);
      loadData();
      setToastMessage('Treino adicionado ao grupo');
      setToastVisible(true);
      navigation.navigate('EditWorkout', { workoutId: newWorkoutId });
    } catch (err) {
      console.warn('Erro ao adicionar treino:', err);
    }
  };

  // Iniciar treino (com checagem de treino em andamento)
  const handleStartWorkout = (workout: WorkoutItemDetail) => {
    triggerHaptic('medium');
    const existing = getInProgressSession();
    if (existing) {
      setConflictSession(existing);
      setPendingWorkoutToStart(workout);
      setConflictModalVisible(true);
      return;
    }

    // Inicia diretamente
    const sessionId = startWorkoutSession(workout.id, workout.name);
    setToastMessage(`Treino "${workout.name}" iniciado`);
    setToastVisible(true);
    navigation.navigate('ActiveSession', { sessionId, workoutId: workout.id });
  };

  // Iniciar treino livre
  const handleStartQuickSession = () => {
    triggerHaptic('medium');
    const existing = getInProgressSession();
    if (existing) {
      setConflictSession(existing);
      setPendingWorkoutToStart(null); // indica treino avulso
      setConflictModalVisible(true);
      return;
    }

    const sessionId = startWorkoutSession(undefined, 'Treino avulso');
    setToastMessage('Treino avulso iniciado');
    setToastVisible(true);
    navigation.navigate('ActiveSession', { sessionId });
  };

  // Resolução de conflito: continuar treino atual
  const handleContinueExistingSession = () => {
    if (!conflictSession) return;
    triggerHaptic('light');
    setConflictModalVisible(false);
    navigation.navigate('ActiveSession', {
      sessionId: conflictSession.id,
      workoutId: conflictSession.workoutId || undefined,
    });
  };

  // Resolução de conflito: descartar e iniciar novo
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
    } else {
      const sessionId = startWorkoutSession(undefined, 'Treino avulso');
      setToastMessage('Treino avulso iniciado');
      setToastVisible(true);
      navigation.navigate('ActiveSession', { sessionId });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho "Meus treinos" com botão pílula "+ Novo grupo" e engrenagem */}
      <ScreenHeader
        title="Meus treinos"
        style={styles.headerContainer}
        rightAction={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setNewGroupModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.newGroupPill,
                pressed && styles.newGroupPillPressed,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Criar novo grupo de treino"
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Plus size={15} color={colors.primary} strokeWidth={2.4} />
              <Text variant="labelSmall" style={styles.newGroupPillText}>
                Novo grupo
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('Ajustes');
              }}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ajustes"
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
            >
              <Settings size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado 3.2: Nenhum grupo criado */}
        {data.totalGroups === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <EmptyWorkoutsIllustration size={144} style={styles.emptyIllustration} />

              <Text variant="headline" style={styles.emptyTitle}>
                Nenhum grupo de treino
              </Text>
              <Text variant="bodyMedium" color="secondary" style={styles.emptySubtitle}>
                Organize seus dias em divisões como PPL, Upper/Lower ou fichas personalizadas.
              </Text>

              <View style={styles.emptyActions}>
                <Button
                  title="Criar meu primeiro grupo"
                  variant="primary"
                  icon={<Plus size={18} color={colors.onPrimary} strokeWidth={2} />}
                  onPress={() => setNewGroupModalVisible(true)}
                  style={styles.emptyPrimaryButton}
                />

                <Button
                  title="Usar modelo PPL padrão"
                  variant="secondary"
                  disabled={isCreatingPPL}
                  loading={isCreatingPPL}
                  icon={<Sparkles size={18} color={colors.primary} strokeWidth={1.75} />}
                  onPress={handleSeedDefaultPPL}
                  style={styles.emptySecondaryButton}
                />
              </View>
            </View>

            {/* Dica de periodização */}
            <View style={styles.tipCard}>
              <View style={styles.tipIconBox}>
                <Lightbulb size={20} color={colors.primary} strokeWidth={1.75} />
              </View>
              <View style={styles.tipContent}>
                <Text variant="bodySmall" style={styles.tipTitle}>
                  Dica de periodização:
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.tipText}>
                  divisões em grupos mantêm seus descansos em dia.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Estado 3.1: Com grupos cadastrados */
          <View style={styles.groupsSection}>
            {data.groups.map((group, index) => {
              const isExpanded = expandedGroupIds.has(group.id);

              // Renderização do grupo ativo (cabeçalho de seção limpo, sem cardception)
              if (group.isActive) {
                return (
                  <View key={group.id} style={styles.activeGroupSection}>
                    {/* Cabeçalho do grupo ativo */}
                    <View style={styles.groupHeaderContainer}>
                      <View style={styles.groupHeaderTopRow}>
                        {/* Selo Ativo com bolinha pulsante */}
                        <View style={styles.activeBadge}>
                          <View style={styles.activeDot} />
                          <Text variant="labelSmall" style={styles.activeBadgeText}>
                            Ativo
                          </Text>
                        </View>

                        <View style={styles.groupHeaderButtons}>
                          <Pressable
                            onPress={() => {
                              triggerHaptic('light');
                              setSelectedGroup(group);
                              setMenuVisible(true);
                            }}
                            style={({ pressed }) => [
                              styles.iconCircle,
                              pressed && styles.iconCirclePressed,
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Mais opções do grupo ${group.name}`}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MoreVertical size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                          </Pressable>

                          <Pressable
                            onPress={() => toggleGroupExpand(group.id)}
                            style={({ pressed }) => [
                              styles.iconCircle,
                              pressed && styles.iconCirclePressed,
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={isExpanded ? 'Recolher grupo' : 'Expandir grupo'}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {isExpanded ? (
                              <ChevronUp size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                            ) : (
                              <ChevronDown size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                            )}
                          </Pressable>
                        </View>
                      </View>

                      {/* Nome e subtítulo de frequência */}
                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                          navigation.navigate('GroupDetail', { groupId: group.id });
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir detalhes do grupo ${group.name}`}
                      >
                        <View style={styles.groupNameRow}>
                          <Text variant="headline" style={styles.activeGroupName}>
                            {group.name}
                          </Text>
                          <Text variant="bodySmall" color="secondary" style={styles.groupFrequency}>
                            {group.frequencyText}
                          </Text>
                        </View>

                        {group.description ? (
                          <Text variant="bodySmall" color="secondary" style={styles.groupDescription}>
                            {group.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    </View>

                    {/* Lista de treinos internos (quando expandido) */}
                    {isExpanded && (
                      <View style={styles.workoutsContainer}>
                        {group.workouts.map((w) => (
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
                                <Text variant="bodySmall" color="secondary" style={styles.workoutMuscles} numberOfLines={1}>
                                  {`• ${w.targetMuscles}`}
                                </Text>
                              </View>

                              {/* Linha 2: Resumo métrico tabular + indicador de Próximo se aplicável */}
                              <View style={styles.workoutMetaRow}>
                                {w.isNext && (
                                  <View style={styles.nextBadge}>
                                    <Text variant="labelSmall" style={styles.nextBadgeText}>
                                      Próximo
                                    </Text>
                                  </View>
                                )}
                                <Text variant="bodySmall" color="secondary" tabular style={styles.workoutStatsText} numberOfLines={1}>
                                  {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'} · ${w.totalSets} ${w.totalSets === 1 ? 'série' : 'séries'} · ~${w.estimatedDurationMin} min`}
                                </Text>
                              </View>
                            </Pressable>

                            {/* Botão pílula coral Iniciar: única ação explícita à direita com folga */}
                            <Pressable
                              onPress={() => handleStartWorkout(w)}
                              style={({ pressed }) => [
                                styles.startWorkoutButton,
                                pressed && styles.startWorkoutButtonPressed,
                              ]}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel={`Iniciar treino ${w.name}`}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                            >
                              <Play size={15} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                              <Text variant="labelSmall" style={styles.startWorkoutText}>
                                Iniciar
                              </Text>
                            </Pressable>
                          </View>
                        ))}

                        {/* Botão nativo e elegante para adicionar treino ao grupo */}
                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            setTargetGroupIdForWorkout(group.id);
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
                      </View>
                    )}
                  </View>
                );
              }

              // Renderização dos grupos secundários / inativos (recolhidos por padrão)
              const isFirstInactive = index === 0 || data.groups[index - 1]?.isActive;

              return (
                <React.Fragment key={group.id}>
                  {isFirstInactive && (
                    <View style={styles.otherGroupsHeader}>
                      <Text variant="bodySmall" color="secondary" style={styles.otherGroupsTitle}>
                        Outras divisões
                      </Text>
                    </View>
                  )}
                  <View style={styles.inactiveGroupCard}>
                  <View style={styles.inactiveGroupHeader}>
                    <Pressable
                      style={styles.inactiveGroupMain}
                      onPress={() => toggleGroupExpand(group.id)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`Grupo ${group.name}, ${isExpanded ? 'recolher' : 'expandir'}`}
                    >
                      <View style={styles.inactiveBadgeRow}>
                        <View style={styles.inactiveBadge}>
                          <Text variant="labelSmall" style={styles.inactiveBadgeText}>
                            {group.badge}
                          </Text>
                        </View>
                      </View>

                      <Text variant="headline" style={styles.inactiveGroupName}>
                        {group.name}
                      </Text>

                      <Text variant="bodySmall" color="secondary" style={styles.inactiveGroupSummary} numberOfLines={1}>
                        {`${group.description || group.name} · ${group.workoutCount} treinos · ~${group.totalEstimatedMin} min`}
                      </Text>
                    </Pressable>

                    <View style={styles.groupHeaderButtons}>
                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                          setSelectedGroup(group);
                          setMenuVisible(true);
                        }}
                        style={({ pressed }) => [
                          styles.iconCircle,
                          pressed && styles.iconCirclePressed,
                        ]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Mais opções do grupo ${group.name}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                      </Pressable>

                      <Pressable
                        onPress={() => toggleGroupExpand(group.id)}
                        style={({ pressed }) => [
                          styles.iconCircle,
                          pressed && styles.iconCirclePressed,
                        ]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? 'Recolher grupo' : 'Expandir grupo'}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                        ) : (
                          <ChevronDown size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  {/* Conteúdo expandido de grupo inativo */}
                  {isExpanded && (
                    <View style={styles.inactiveExpandedContainer}>
                      <Button
                        title="Definir como grupo ativo"
                        variant="secondary"
                        icon={<Check size={16} color={colors.primary} strokeWidth={2} />}
                        onPress={() => handleSetActiveGroup(group.id, group.name)}
                        style={styles.activateGroupButton}
                      />

                      {group.workouts.map((w) => (
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
                              <Text variant="bodySmall" color="secondary" style={styles.workoutMuscles} numberOfLines={1}>
                                {`• ${w.targetMuscles}`}
                              </Text>
                            </View>

                            {/* Linha 2: Resumo métrico tabular */}
                            <View style={styles.workoutMetaRow}>
                              <Text variant="bodySmall" color="secondary" tabular style={styles.workoutStatsText} numberOfLines={1}>
                                {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'} · ${w.totalSets} ${w.totalSets === 1 ? 'série' : 'séries'} · ~${w.estimatedDurationMin} min`}
                              </Text>
                            </View>
                          </Pressable>

                          {/* Botão pílula coral Iniciar: única ação explícita à direita com folga */}
                          <Pressable
                            onPress={() => handleStartWorkout(w)}
                            style={({ pressed }) => [
                              styles.startWorkoutButton,
                              pressed && styles.startWorkoutButtonPressed,
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Iniciar treino ${w.name}`}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                          >
                            <Play size={15} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                            <Text variant="labelSmall" style={styles.startWorkoutText}>
                              Iniciar
                            </Text>
                          </Pressable>
                        </View>
                      ))}

                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                          setTargetGroupIdForWorkout(group.id);
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
                    </View>
                  )}
                </View>
              </React.Fragment>
            );
          })}
          </View>
        )}

        {/* Cartão de Treino Avulso / Rápido */}
        <Pressable
          onPress={handleStartQuickSession}
          style={({ pressed }) => [
            styles.quickWorkoutCard,
            pressed && styles.quickWorkoutCardPressed,
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Iniciar treino avulso ou rápido"
        >
          <View style={styles.quickWorkoutLeft}>
            <View style={styles.quickWorkoutIconBox}>
              <Zap size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.quickWorkoutTextContainer}>
              <Text variant="headline" style={styles.quickWorkoutTitle}>
                Treino avulso ou rápido?
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.quickWorkoutSubtitle} numberOfLines={1}>
                Registre pesos e repetições livres, sem rotina prévia.
              </Text>
            </View>
          </View>

          <ChevronRight size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
        </Pressable>
      </ScrollView>

      {/* Modal de opções do grupo (…) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            {selectedGroup && !selectedGroup.isActive && (
              <>
                <Pressable
                  onPress={() => handleSetActiveGroup(selectedGroup.id, selectedGroup.name)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    pressed && styles.menuItemPressed,
                  ]}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Check size={18} color={colors.primary} strokeWidth={2} />
                  <Text variant="bodyMedium" style={styles.menuItemText}>
                    Definir como ativo
                  </Text>
                </Pressable>
                <View style={styles.menuDivider} />
              </>
            )}

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setMenuVisible(false);
                setEditGroupSheetVisible(true);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
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
              onPress={() => {
                if (selectedGroup) handleDuplicateGroup(selectedGroup);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
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
                setMenuVisible(false);
                setDeleteModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
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

      {/* ConfirmModal para exclusão de grupo */}
      <ConfirmModal
        visible={deleteModalVisible}
        title="Excluir grupo de treino?"
        description={`O grupo "${selectedGroup?.name}" e suas fichas associadas serão excluídos. O histórico de treinos já realizados continuará seguro.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      {/* Sheet para Criar Novo Grupo (3.4) */}
      <EditGroupSheet
        visible={newGroupModalVisible}
        mode="create"
        existingGroupNames={getExistingGroupNames()}
        onClose={() => setNewGroupModalVisible(false)}
        onSave={(formData) => {
          try {
            createWorkoutGroup(
              formData.name,
              formData.description,
              formData.frequencyDays
            );
            triggerHaptic('success');
            setNewGroupModalVisible(false);
            loadData();
            setToastMessage('Grupo de treino criado com sucesso');
            setToastVisible(true);
          } catch (err) {
            console.warn('Erro ao criar grupo:', err);
          }
        }}
      />

      {/* Sheet para Editar Grupo (3.4) */}
      {selectedGroup && (
        <EditGroupSheet
          visible={editGroupSheetVisible}
          mode="edit"
          initialData={{
            id: selectedGroup.id,
            name: selectedGroup.name,
            description: selectedGroup.description,
            frequencyDays: selectedGroup.frequencyDays,
          }}
          existingGroupNames={getExistingGroupNames(selectedGroup.id)}
          onClose={() => setEditGroupSheetVisible(false)}
          onSave={handleSaveEditGroup}
          onDelete={() => {
            setEditGroupSheetVisible(false);
            setDeleteModalVisible(true);
          }}
        />
      )}

      {/* Modal para adicionar treino a um grupo */}
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
              onPress={handleAddWorkout}
              style={styles.fullWidthButton}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Modal de conflito: treino já em andamento */}
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

      {/* Toast de notificação */}
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
    paddingBottom: spacing.tabBarHeight + spacing.xl,
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 36,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  newGroupPillPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  newGroupPillText: {
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },

  // Grupo Ativo
  groupsSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  activeGroupSection: {
    marginBottom: spacing.xs,
  },
  groupHeaderContainer: {
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  groupHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    borderRadius: radii.pill,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activeBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  groupHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCirclePressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: 2,
  },
  activeGroupName: {
    color: colors.onSurface,
    lineHeight: 30,
  },
  groupFrequency: {
    fontSize: 13,
  },
  groupDescription: {
    marginTop: 4,
    lineHeight: 18,
  },

  // Lista de treinos internos
  workoutsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  },
  workoutMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nextBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 122, 89, 0.16)',
    borderRadius: radii.pill,
  },
  nextBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  workoutStatsText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
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
    flexShrink: 0,
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
    marginTop: spacing.xs,
  },
  addWorkoutButtonPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  addWorkoutButtonText: {
    color: colors.onSurface,
    fontWeight: '600',
  },

  // Seção de Outras Divisões
  otherGroupsHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  otherGroupsTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },

  // Grupos Inativos
  inactiveGroupCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  inactiveGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inactiveGroupMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  inactiveBadgeRow: {
    marginBottom: 4,
  },
  inactiveBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  inactiveBadgeText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  inactiveGroupName: {
    color: colors.onSurface,
    fontSize: 18,
    lineHeight: 22,
  },
  inactiveGroupSummary: {
    marginTop: 2,
    fontSize: 12,
  },
  inactiveExpandedContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  activateGroupButton: {
    marginBottom: 4,
  },

  // Treino Avulso / Rápido
  quickWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  quickWorkoutCardPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
  },
  quickWorkoutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickWorkoutIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWorkoutTextContainer: {
    flex: 1,
  },
  quickWorkoutTitle: {
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 20,
  },
  quickWorkoutSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },

  // Estado Vazio (3.2)
  emptyContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  emptyIllustration: {
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  emptyActions: {
    width: '100%',
    gap: spacing.sm,
  },
  emptyPrimaryButton: {
    width: '100%',
  },
  emptySecondaryButton: {
    width: '100%',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tipIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  tipText: {
    marginTop: 2,
  },

  // Modal de opções (…)
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
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
  menuItemPressed: {
    backgroundColor: colors.surfaceContainerHighest,
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

  // Formulários em BottomSheet
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
});
