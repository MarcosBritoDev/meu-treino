import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Folders,
  Dumbbell,
  ClipboardList,
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
  EmptyWorkoutsIllustration,
  triggerHaptic,
} from '../ui';
import {
  getWorkoutGroupsSummary,
  setActiveGroup,
  duplicateGroup,
  deleteGroup,
  seedDefaultPPLGroup,
  getInProgressSession,
  discardInProgressSession,
  startWorkoutSession,
  createWorkoutGroup,
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
      addWorkoutToGroup(targetGroupIdForWorkout, newWorkoutName.trim());
      triggerHaptic('success');
      setNewWorkoutModalVisible(false);
      setNewWorkoutName('');
      setTargetGroupIdForWorkout(null);
      loadData();
      setToastMessage('Treino adicionado ao grupo');
      setToastVisible(true);
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
        rightAction={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setNewGroupModalVisible(true);
              }}
              style={styles.newGroupPill}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Criar novo grupo de treino"
            >
              <Plus size={16} color={colors.primary} strokeWidth={2.2} />
              <Text variant="labelSmall" style={styles.newGroupPillText}>
                Novo grupo
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('Ajustes');
              }}
              style={styles.iconButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ajustes"
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
        {/* Dois cartões de resumo com contadores reais */}
        <View style={styles.metricsRow}>
          {/* Card 1: Grupos de treino / Grupos ativos */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}>
              <Folders size={20} color={colors.primary} strokeWidth={1.75} />
            </View>
            <View style={styles.metricInfo}>
              <View style={styles.metricValueRow}>
                <Text variant="displayMedium" style={styles.metricNumber}>
                  {data.totalGroups}
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.metricUnit}>
                  {data.totalGroups === 0 ? 'grupos' : data.totalGroups === 1 ? 'grupo' : 'grupos'}
                </Text>
              </View>
              <Text variant="labelSmall" color="secondary" numberOfLines={1}>
                {data.totalGroups === 0 ? 'Grupos ativos' : 'Grupos de treino'}
              </Text>
            </View>
          </View>

          {/* Card 2: Treinos montados / Fichas salvas */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBox}>
              {data.totalGroups === 0 ? (
                <ClipboardList size={20} color={colors.pr} strokeWidth={1.75} />
              ) : (
                <Dumbbell size={20} color={colors.pr} strokeWidth={1.75} />
              )}
            </View>
            <View style={styles.metricInfo}>
              <View style={styles.metricValueRow}>
                <Text variant="displayMedium" style={styles.metricNumber}>
                  {data.totalWorkouts}
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.metricUnit}>
                  {data.totalWorkouts === 0 ? 'treinos' : data.totalWorkouts === 1 ? 'treino' : 'treinos'}
                </Text>
              </View>
              <Text variant="labelSmall" color="secondary" numberOfLines={1}>
                {data.totalGroups === 0 ? 'Fichas salvas' : 'Treinos montados'}
              </Text>
            </View>
          </View>
        </View>

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
                  icon={<Sparkles size={18} color={colors.pr} strokeWidth={1.75} />}
                  onPress={handleSeedDefaultPPL}
                  style={styles.emptySecondaryButton}
                />
              </View>
            </View>

            {/* Dica de periodização */}
            <View style={styles.tipCard}>
              <View style={styles.tipIconBox}>
                <Lightbulb size={20} color={colors.pr} strokeWidth={1.75} />
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
            {data.groups.map((group) => {
              const isExpanded = expandedGroupIds.has(group.id);

              // Renderização do grupo ativo (foco e destaque visual)
              if (group.isActive) {
                return (
                  <View key={group.id} style={styles.activeGroupCard}>
                    {/* Linha de acento gradiente superior */}
                    <View style={styles.activeGroupAccentLine} />

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
                            style={styles.iconCircle}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Mais opções do grupo ${group.name}`}
                          >
                            <MoreVertical size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                          </Pressable>

                          <Pressable
                            onPress={() => toggleGroupExpand(group.id)}
                            style={styles.iconCircle}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={isExpanded ? 'Recolher grupo' : 'Expandir grupo'}
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
                            <View style={styles.workoutItemTopRow}>
                              <View style={styles.workoutItemLeft}>
                                <View style={styles.workoutCodeBox}>
                                  <Text variant="labelSmall" style={styles.workoutCodeText}>
                                    {w.code}
                                  </Text>
                                </View>
                                <View style={styles.workoutTitleBlock}>
                                  <Text variant="bodyLarge" style={styles.workoutName}>
                                    {w.name}
                                  </Text>
                                  <Text variant="labelSmall" color="secondary" numberOfLines={1}>
                                    {w.targetMuscles}
                                  </Text>
                                </View>
                              </View>

                              {/* Ações do treino: Editar (lápis) e Iniciar (play coral) */}
                              <View style={styles.workoutActions}>
                                <Pressable
                                  onPress={() => {
                                    triggerHaptic('light');
                                    navigation.navigate('EditWorkout', { workoutId: w.id });
                                  }}
                                  style={styles.editWorkoutButton}
                                  accessible={true}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Editar treino ${w.name}`}
                                >
                                  <Edit2 size={16} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                                </Pressable>

                                <Pressable
                                  onPress={() => handleStartWorkout(w)}
                                  style={styles.startWorkoutButton}
                                  accessible={true}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Iniciar treino ${w.name}`}
                                >
                                  <Play size={15} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                                  <Text variant="labelSmall" style={styles.startWorkoutText}>
                                    Iniciar
                                  </Text>
                                </Pressable>
                              </View>
                            </View>

                            {/* Estatísticas calculadas: exercícios, séries e duração estimada */}
                            <View style={styles.workoutStatsRow}>
                              <Text variant="labelSmall" style={styles.workoutStatsBold}>
                                {`${w.exerciseCount} ${w.exerciseCount === 1 ? 'exercício' : 'exercícios'}`}
                              </Text>
                              <Text variant="labelSmall" color="secondary">
                                •
                              </Text>
                              <Text variant="labelSmall" color="secondary">
                                {`${w.totalSets} ${w.totalSets === 1 ? 'série' : 'séries'}`}
                              </Text>
                              <Text variant="labelSmall" color="secondary">
                                •
                              </Text>
                              <Text variant="labelSmall" color="secondary">
                                {`~${w.estimatedDurationMin} min`}
                              </Text>
                            </View>

                            {/* Prévia dos primeiros exercícios */}
                            {w.previewExercises ? (
                              <Text variant="bodySmall" color="secondary" style={styles.workoutPreviewText} numberOfLines={1}>
                                {w.previewExercises}
                              </Text>
                            ) : null}
                          </View>
                        ))}

                        {/* Botão para adicionar treino ao grupo */}
                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            setTargetGroupIdForWorkout(group.id);
                            setNewWorkoutModalVisible(true);
                          }}
                          style={styles.addWorkoutToGroupButton}
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel="Adicionar treino ao grupo"
                        >
                          <Plus size={16} color={colors.primary} strokeWidth={2} />
                          <Text variant="bodySmall" style={styles.addWorkoutToGroupText}>
                            Adicionar treino ao grupo
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              }

              // Renderização dos grupos secundários / inativos (recolhidos por padrão)
              return (
                <View key={group.id} style={styles.inactiveGroupCard}>
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
                        style={styles.iconCircle}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Mais opções do grupo ${group.name}`}
                      >
                        <MoreVertical size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                      </Pressable>

                      <Pressable
                        onPress={() => toggleGroupExpand(group.id)}
                        style={styles.iconCircle}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? 'Recolher grupo' : 'Expandir grupo'}
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
                          <View style={styles.workoutItemTopRow}>
                            <View style={styles.workoutItemLeft}>
                              <View style={styles.workoutCodeBox}>
                                <Text variant="labelSmall" style={styles.workoutCodeText}>
                                  {w.code}
                                </Text>
                              </View>
                              <View style={styles.workoutTitleBlock}>
                                <Text variant="bodyLarge" style={styles.workoutName}>
                                  {w.name}
                                </Text>
                                <Text variant="labelSmall" color="secondary" numberOfLines={1}>
                                  {w.targetMuscles}
                                </Text>
                              </View>
                            </View>

                            <Pressable
                              onPress={() => handleStartWorkout(w)}
                              style={styles.startWorkoutButton}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel={`Iniciar treino ${w.name}`}
                            >
                              <Play size={15} color={colors.onPrimary} fill={colors.onPrimary} strokeWidth={1.75} />
                              <Text variant="labelSmall" style={styles.startWorkoutText}>
                                Iniciar
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}

                      <Pressable
                        onPress={() => {
                          triggerHaptic('light');
                          setTargetGroupIdForWorkout(group.id);
                          setNewWorkoutModalVisible(true);
                        }}
                        style={styles.addWorkoutToGroupButton}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar treino ao grupo"
                      >
                        <Plus size={16} color={colors.primary} strokeWidth={2} />
                        <Text variant="bodySmall" style={styles.addWorkoutToGroupText}>
                          Adicionar treino ao grupo
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Cartão de Treino Avulso / Rápido */}
        <Pressable
          onPress={handleStartQuickSession}
          style={styles.quickWorkoutCard}
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
                  style={styles.menuItem}
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
                if (selectedGroup) {
                  navigation.navigate('EditGroup', { groupId: selectedGroup.id });
                }
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
              onPress={() => {
                if (selectedGroup) handleDuplicateGroup(selectedGroup);
              }}
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
                setMenuVisible(false);
                setDeleteModalVisible(true);
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

      {/* Modal para criar novo grupo */}
      <BottomSheet
        visible={newGroupModalVisible}
        onClose={() => setNewGroupModalVisible(false)}
        title="Novo grupo de treino"
      >
        <View style={styles.bottomSheetForm}>
          <TextField
            label="Nome do grupo *"
            placeholder="Ex.: ABC, Upper / Lower, Fullbody"
            value={newGroupName}
            onChangeText={setNewGroupName}
            maxLength={40}
          />

          <TextField
            label="Descrição ou foco (opcional)"
            placeholder="Ex.: Foco em força e hipertrofia"
            value={newGroupDesc}
            onChangeText={setNewGroupDesc}
            maxLength={80}
            containerStyle={styles.formFieldSpacing}
          />

          <View style={styles.formButtonRow}>
            <Button
              title="Criar grupo"
              variant="primary"
              disabled={!newGroupName.trim()}
              onPress={handleCreateGroup}
              style={styles.fullWidthButton}
            />
          </View>
        </View>
      </BottomSheet>

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  newGroupPillText: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  iconButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricNumber: {
    color: colors.onSurface,
    lineHeight: 28,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricUnit: {
    fontSize: 12,
  },

  // Grupo Ativo
  groupsSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  activeGroupCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.35)',
    position: 'relative',
    overflow: 'hidden',
  },
  activeGroupAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  groupHeaderContainer: {
    marginBottom: spacing.sm,
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
    textTransform: 'uppercase',
  },
  groupHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  workoutItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workoutItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workoutCodeBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutCodeText: {
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 11,
  },
  workoutTitleBlock: {
    flex: 1,
  },
  workoutName: {
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 20,
  },
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editWorkoutButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  startWorkoutText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  workoutStatsBold: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  workoutPreviewText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  addWorkoutToGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  addWorkoutToGroupText: {
    color: colors.onSurface,
    fontWeight: '500',
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
