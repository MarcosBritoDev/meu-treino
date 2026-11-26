import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Settings,
  Play,
  Check,
  Dumbbell,
  Clock,
  Repeat,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  Weight,
  Zap,
  Moon,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, fontFamilies } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { triggerHaptic } from '../ui/haptics';
import { EmptyHomeIllustration } from '../ui/illustrations/EmptyHomeIllustration';
import { ConfirmModal } from '../ui/ConfirmModal';
import { getHomeScreenData, HomeScreenData } from '../db/home';
import {
  startWorkoutSession,
  createWorkoutFromPopularTemplate,
} from '../db/workouts';
import { getExpoDb } from '../db/client';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const [data, setData] = useState<HomeScreenData | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  // Recarrega os dados da tela sempre que ganha foco (ao voltar de outra tela)
  const loadData = useCallback(() => {
    try {
      const homeData = getHomeScreenData();
      setData(homeData);
      if (homeData.activeSession) {
        setElapsedSeconds(homeData.activeSession.elapsedSeconds);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados do Início:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Cronômetro ao vivo se houver treino em andamento
  useEffect(() => {
    if (!data?.activeSession) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.activeSession]);

  const formattedElapsed = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }, [elapsedSeconds]);

  // Iniciar treino recomendado
  const handleStartRecommendedWorkout = () => {
    if (!data?.recommendedWorkout) return;
    triggerHaptic('medium');
    const sessionId = startWorkoutSession(
      data.recommendedWorkout.id,
      data.recommendedWorkout.name
    );
    navigation.navigate('ActiveSession', {
      sessionId,
      workoutId: data.recommendedWorkout.id,
    });
  };

  // Iniciar sessão livre avulsa (Estado 4.2: abre treino em andamento vazio)
  const handleStartFreeWorkout = () => {
    triggerHaptic('medium');
    const sessionId = startWorkoutSession(undefined, 'Treino avulso');
    navigation.navigate('ActiveSession', {
      sessionId,
    });
  };

  // Criar treino a partir de modelo popular (Estado 4.2)
  const handleSelectPopularTemplate = (type: 'superior_a' | 'pernas_core') => {
    triggerHaptic('medium');
    const workoutId = createWorkoutFromPopularTemplate(type);
    navigation.navigate('EditWorkout', {
      workoutId,
    });
  };

  // Continuar treino ativo
  const handleContinueActiveSession = () => {
    if (!data?.activeSession) return;
    triggerHaptic('light');
    navigation.navigate('ActiveSession', {
      sessionId: data.activeSession.id,
      workoutId: data.activeSession.workoutId || undefined,
    });
  };

  // Descartar treino em andamento
  const handleConfirmDiscardSession = () => {
    if (!data?.activeSession) return;
    try {
      const rawDb = getExpoDb();
      rawDb.runSync(
        `UPDATE sessions SET status = 'discarded', ended_at = ? WHERE id = ?`,
        [Date.now(), data.activeSession.id]
      );
      triggerHaptic('medium');
      setDiscardModalVisible(false);
      loadData();
    } catch (err) {
      console.warn('Erro ao descartar sessão ativa:', err);
    }
  };

  const displayName = data?.userName || 'Atleta';
  const showEmptyState =
    !data?.activeSession && (!data?.hasActiveGroup || !data?.recommendedWorkout);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <Text variant="labelSmall" style={styles.headerBrand}>
          Início
        </Text>
        <Pressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('Ajustes');
          }}
          style={styles.settingsButton}
          accessibilityRole="button"
          accessibilityLabel="Abrir Ajustes"
        >
          <Settings size={22} color={colors.onSurfaceVariant} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* DATA E SAUDAÇÃO REAL */}
        <View style={styles.greetingContainer}>
          <Text variant="bodySmall" style={styles.dateText}>
            {data?.formattedDate || 'Hoje'}
          </Text>
          <Text variant="headline" style={styles.greetingTitle}>
            {data?.greeting || 'Olá'}, {displayName}
          </Text>
        </View>

        {showEmptyState ? (
          /* ================================================================
             ESTADO 4.2: INÍCIO SEM TREINO (QUANDO NÃO HÁ GRUPO COM TREINOS)
             ================================================================ */
          <>
            {/* CARTÃO GRANDE COM EMPTY STATE */}
            <Card variant="surface" style={styles.emptyCard}>
              <View style={styles.emptyGlow} pointerEvents="none" />

              {/* ILUSTRAÇÃO COM SELO "PAUSA" */}
              <View style={styles.emptyIllustrationWrapper}>
                <EmptyHomeIllustration size={130} />
                <View style={styles.pauseBadge}>
                  <Moon size={13} color="#F6BC64" strokeWidth={2.4} fill="#F6BC64" />
                  <Text variant="labelSmall" style={styles.pauseBadgeText}>
                    Pausa
                  </Text>
                </View>
              </View>

              <Text variant="headline" style={styles.emptyTitle}>
                Nenhum treino para hoje
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                Monte sua rotina semanal ou inicie uma sessão rápida avulsa.
              </Text>

              {/* BOTÕES DE AÇÃO */}
              <View style={styles.emptyActions}>
                <Button
                  title="Montar primeiro treino"
                  variant="primary"
                  icon={<PlusCircle size={20} color={colors.onPrimary} strokeWidth={2.2} />}
                  onPress={() => {
                    triggerHaptic('medium');
                    navigation.navigate('MainTabs', { screen: 'Treinos' });
                  }}
                  style={styles.emptyPrimaryButton}
                />

                <Pressable
                  onPress={handleStartFreeWorkout}
                  style={styles.emptyFreeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar sessão livre avulsa"
                >
                  <Play size={17} color={colors.onSurfaceVariant} fill={colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={styles.emptyFreeText}>
                    Iniciar sessão livre avulsa
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* CARTÃO DE DICA: DICA VOLT · PRIVACIDADE TOTAL */}
            <View style={styles.dicaVoltCard}>
              <View style={styles.dicaVoltIconCircle}>
                <ShieldCheck size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.dicaVoltContent}>
                <View style={styles.dicaVoltHeader}>
                  <Text variant="labelSmall" style={styles.dicaVoltTag}>
                    Dica Volt
                  </Text>
                  <View style={styles.dicaVoltDot} />
                  <Text variant="labelSmall" style={styles.dicaVoltTitle}>
                    Privacidade total
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.dicaVoltDescription}>
                  Seus registros e cargas são salvos 100% offline no dispositivo. Sem necessidade de sinal de academia para progredir.
                </Text>
              </View>
            </View>

            {/* SEÇÃO: IDEIAS POPULARES PARA INICIAR */}
            <View style={styles.popularSection}>
              <View style={styles.popularHeaderRow}>
                <Text variant="labelSmall" style={styles.popularSectionTitle}>
                  Ideias populares para iniciar
                </Text>
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    navigation.navigate('MainTabs', { screen: 'Treinos' });
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Ver modelos de treino"
                >
                  <Text variant="labelSmall" style={styles.viewTemplatesLink}>
                    Ver modelos
                  </Text>
                </Pressable>
              </View>

              <View style={styles.popularGrid}>
                {/* MODELO 1: SUPERIOR A */}
                <Pressable
                  onPress={() => handleSelectPopularTemplate('superior_a')}
                  style={({ pressed }) => [
                    styles.popularCard,
                    pressed && styles.popularCardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Criar modelo Superior A: Peito, ombros e tríceps"
                >
                  <View style={styles.popularCardTop}>
                    <Text variant="bodyLarge" style={styles.popularCardTitle}>
                      Superior A
                    </Text>
                    <Dumbbell size={20} color={colors.primary} strokeWidth={2} />
                  </View>
                  <Text variant="labelSmall" style={styles.popularCardSubtitle}>
                    Peito, ombros e tríceps
                  </Text>
                  <View style={styles.popularCardDecoration} pointerEvents="none" />
                </Pressable>

                {/* MODELO 2: PERNAS E CORE */}
                <Pressable
                  onPress={() => handleSelectPopularTemplate('pernas_core')}
                  style={({ pressed }) => [
                    styles.popularCard,
                    pressed && styles.popularCardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Criar modelo Pernas e core: Quadríceps e panturrilha"
                >
                  <View style={styles.popularCardTop}>
                    <Text variant="bodyLarge" style={styles.popularCardTitle}>
                      Pernas e core
                    </Text>
                    <Zap size={20} color="#F6BC64" strokeWidth={2} />
                  </View>
                  <Text variant="labelSmall" style={styles.popularCardSubtitle}>
                    Quadríceps e panturrilha
                  </Text>
                  <View style={styles.popularCardDecoration} pointerEvents="none" />
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          /* ================================================================
             ESTADO 4.1: INÍCIO COM TREINO RECOMENDADO OU EM ANDAMENTO
             ================================================================ */
          <>
            {data?.activeSession ? (
              /* CARTÃO: TREINO EM ANDAMENTO */
              <Card variant="highlight" style={styles.heroCard}>
                <View style={styles.heroGlow} pointerEvents="none" />
                <View style={styles.heroContent}>
                  <View style={styles.activeSessionChip}>
                    <View style={styles.pulsingDot} />
                    <Text variant="labelSmall" style={styles.activeSessionChipText}>
                      Treino em andamento
                    </Text>
                  </View>

                  <Text variant="headline" style={styles.heroTitle} numberOfLines={2}>
                    {data.activeSession.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.heroSubtitle}>
                    Tempo decorrido: {formattedElapsed}
                  </Text>

                  <Button
                    title="Continuar treino"
                    variant="primary"
                    icon={<Play size={22} color={colors.onPrimary} fill={colors.onPrimary} />}
                    onPress={handleContinueActiveSession}
                    style={styles.heroPrimaryButton}
                  />

                  <Pressable
                    onPress={() => setDiscardModalVisible(true)}
                    style={styles.heroSecondaryLink}
                    accessibilityRole="button"
                    accessibilityLabel="Descartar treino em andamento"
                  >
                    <Text variant="bodySmall" style={styles.heroSecondaryLinkText}>
                      Descartar este treino
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ) : data?.recommendedWorkout ? (
              /* CARTÃO: RECOMENDADO PARA HOJE */
              <Card variant="surface" style={styles.heroCard}>
                <View style={styles.heroGlow} pointerEvents="none" />
                <View style={styles.heroContent}>
                  {/* Chip Recomendado com pulso coral */}
                  <View style={styles.recommendedChip}>
                    <View style={styles.pulsingDot} />
                    <Text variant="labelSmall" style={styles.recommendedChipText}>
                      Recomendado para hoje
                    </Text>
                  </View>

                  {/* Título & Subtítulo */}
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('EditWorkout', {
                        workoutId: data.recommendedWorkout!.id,
                      });
                    }}
                    style={styles.heroTitlesBlock}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir prévia de ${data.recommendedWorkout.name}`}
                  >
                    <Text variant="headline" style={styles.heroTitle} numberOfLines={2}>
                      {data.recommendedWorkout.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.heroSubtitle}>
                      {data.recommendedWorkout.targetMuscles} · Grupo {data.recommendedWorkout.groupName}
                    </Text>
                    <Text variant="labelSmall" style={styles.heroSummaryBadge}>
                      {data.recommendedWorkout.summaryText || `${data.recommendedWorkout.totalSets} ${data.recommendedWorkout.totalSets === 1 ? 'série' : 'séries'} · ~${data.recommendedWorkout.estimatedDurationMin} min`}
                    </Text>
                  </Pressable>

                  {/* Indicador de Ciclo e Segmentos de Progresso */}
                  <View style={styles.cycleBlock}>
                    <View style={styles.cycleLabelRow}>
                      <Text variant="bodySmall" style={styles.cycleText}>
                        {data.recommendedWorkout.cycleIndex} de {data.recommendedWorkout.cycleTotal} no ciclo
                      </Text>
                    </View>
                    <View style={styles.cycleBarRow}>
                      {Array.from({ length: data.recommendedWorkout.cycleTotal }).map((_, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.cycleBarSegment,
                            idx < data.recommendedWorkout!.cycleIndex
                              ? styles.cycleBarSegmentActive
                              : styles.cycleBarSegmentInactive,
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Trio de Métricas em Outfit */}
                  <View style={styles.metricsBox}>
                    <View style={styles.metricColumn}>
                      <Text variant="headline" style={styles.metricBigNumber}>
                        {data.recommendedWorkout.exerciseCount}
                      </Text>
                      <Text variant="labelSmall" style={styles.metricSmallLabel}>
                        exercícios
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricColumn}>
                      <Text variant="headline" style={styles.metricBigNumber}>
                        {data.recommendedWorkout.totalSets}
                      </Text>
                      <Text variant="labelSmall" style={styles.metricSmallLabel}>
                        séries
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricColumn}>
                      <Text variant="headline" style={styles.metricBigNumber}>
                        {data.recommendedWorkout.estimatedDurationMin}{' '}
                        <Text variant="bodySmall" style={styles.metricUnitText}>
                          min
                        </Text>
                      </Text>
                      <Text variant="labelSmall" style={styles.metricSmallLabel}>
                        duração
                      </Text>
                    </View>
                  </View>

                  {/* Lista resumida de exercícios: Nome — A + N séries */}
                  {data.recommendedWorkout.exercises && data.recommendedWorkout.exercises.length > 0 && (
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                        navigation.navigate('EditWorkout', {
                          workoutId: data.recommendedWorkout!.id,
                        });
                      }}
                      style={styles.heroExerciseList}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver exercícios de ${data.recommendedWorkout.name}`}
                    >
                      {data.recommendedWorkout.exercises.slice(0, 3).map((ex, idx) => (
                        <Text key={idx} variant="bodySmall" color="secondary" style={styles.heroExerciseItem} numberOfLines={1}>
                          {ex.itemText}
                        </Text>
                      ))}
                      {data.recommendedWorkout.exercises.length > 3 && (
                        <Text variant="labelSmall" color="secondary" style={styles.heroExtraExercises}>
                          {`+${data.recommendedWorkout.exercises.length - 3} ${data.recommendedWorkout.exercises.length - 3 === 1 ? 'exercício' : 'exercícios'}`}
                        </Text>
                      )}
                    </Pressable>
                  )}

                  {/* Botão Primário 56px Iniciar treino */}
                  <Button
                    title="Iniciar treino"
                    variant="primary"
                    icon={<Play size={22} color={colors.onPrimary} fill={colors.onPrimary} />}
                    onPress={handleStartRecommendedWorkout}
                    style={styles.heroPrimaryButton}
                  />

                  {/* Link Secundário: Ver ou alterar exercícios */}
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('EditWorkout', {
                        workoutId: data.recommendedWorkout!.id,
                      });
                    }}
                    style={styles.heroSecondaryLink}
                    accessibilityRole="button"
                    accessibilityLabel="Ver ou alterar exercícios"
                  >
                    <Text variant="bodyMedium" style={styles.heroSecondaryLinkText}>
                      Ver ou alterar exercícios
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ) : null}

            {/* SEÇÃO "SUA SEMANA" */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text variant="headline" style={styles.sectionTitle}>
                  Sua semana
                </Text>
                <View style={styles.weekBadge}>
                  <Text variant="labelSmall" style={styles.weekBadgeText}>
                    {data?.weekStatus
                      ? `${data.weekStatus.completedCount} de ${data.weekStatus.frequencyGoal} treinos`
                      : '0 de 5 treinos'}
                  </Text>
                </View>
              </View>

              {/* 7 CÍRCULOS SEG A DOM */}
              <View style={styles.weekCirclesContainer}>
                {data?.weekStatus?.days.map((day) => {
                  const isCompleted = day.hasCompletedWorkout;
                  const isToday = day.isToday;

                  return (
                    <View key={day.index} style={styles.dayColumn}>
                      <View
                        style={[
                          styles.dayCircle,
                          isCompleted && styles.dayCircleCompleted,
                          !isCompleted && isToday && styles.dayCircleToday,
                          !isCompleted && !isToday && styles.dayCircleDefault,
                        ]}
                      >
                        {isCompleted ? (
                          <Check size={20} color={colors.onPrimary} strokeWidth={3} />
                        ) : (
                          <Text
                            variant="labelSmall"
                            style={[
                              styles.dayNumberText,
                              isToday && styles.dayNumberTextToday,
                            ]}
                          >
                            {day.dayOfMonth}
                          </Text>
                        )}
                      </View>
                      <Text
                        variant="labelSmall"
                        style={[
                          styles.dayLabelText,
                          isToday && styles.dayLabelTextToday,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* SEÇÃO "ÚLTIMO TREINO" */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text variant="headline" style={styles.sectionTitle}>
                  Último treino
                </Text>
                {data?.lastCompletedSession && (
                  <Pressable
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('SessionDetail', {
                        sessionId: data.lastCompletedSession!.id,
                      });
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Ver detalhes do último treino"
                  >
                    <Text variant="labelSmall" style={styles.detailsLinkText}>
                      Detalhes
                    </Text>
                  </Pressable>
                )}
              </View>

              {data?.lastCompletedSession ? (
                <Pressable
                  onPress={() => {
                    triggerHaptic('light');
                    navigation.navigate('SessionDetail', {
                      sessionId: data.lastCompletedSession!.id,
                    });
                  }}
                  style={({ pressed }) => [
                    styles.lastSessionCard,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Último treino: ${data.lastCompletedSession.name}`}
                >
                  <View style={styles.lastSessionLeft}>
                    <View style={styles.lastSessionIconCircle}>
                      <Dumbbell size={22} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.lastSessionInfo}>
                      <View style={styles.lastSessionTitleRow}>
                        <Text variant="bodyLarge" style={styles.lastSessionTitle} numberOfLines={1}>
                          {data.lastCompletedSession.name}
                        </Text>
                        <View style={styles.lastSessionDot} />
                        <Text variant="labelSmall" style={styles.lastSessionDate}>
                          {data.lastCompletedSession.relativeDate}
                        </Text>
                      </View>

                      <View style={styles.lastSessionMetricsRow}>
                        <View style={styles.lastSessionMetricItem}>
                          <Weight size={13} color={colors.onSurfaceVariant} strokeWidth={2} />
                          <Text variant="labelSmall" style={styles.lastSessionMetricText}>
                            {data.lastCompletedSession.totalVolumeText}
                          </Text>
                        </View>
                        <View style={styles.lastSessionMetricItem}>
                          <Clock size={13} color={colors.onSurfaceVariant} strokeWidth={2} />
                          <Text variant="labelSmall" style={styles.lastSessionMetricText}>
                            {data.lastCompletedSession.durationMin} min
                          </Text>
                        </View>
                        <View style={styles.lastSessionMetricItem}>
                          <Repeat size={13} color={colors.onSurfaceVariant} strokeWidth={2} />
                          <Text variant="labelSmall" style={styles.lastSessionMetricText}>
                            {data.lastCompletedSession.totalSets} séries
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.lastSessionChevron}>
                    <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                  </View>
                </Pressable>
              ) : (
                <Card variant="surface" style={styles.noLastSessionCard}>
                  <Text variant="bodySmall" style={styles.noLastSessionText}>
                    Nenhum treino concluído ainda. Inicie seu primeiro treino acima!
                  </Text>
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* MODAL DE CONFIRMAÇÃO PARA DESCARTAR TREINO EM ANDAMENTO */}
      <ConfirmModal
        visible={discardModalVisible}
        title="Descartar treino em andamento?"
        description="O progresso desta sessão não será salvo no histórico."
        confirmLabel="Descartar"
        cancelLabel="Continuar treinando"
        isDanger={true}
        onConfirm={handleConfirmDiscardSession}
        onCancel={() => setDiscardModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 18,
  },
  greetingContainer: {
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3A3531',
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
  },
  heroContent: {
    gap: 16,
  },
  recommendedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 122, 89, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  recommendedChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeSessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 122, 89, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  activeSessionChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  heroTitlesBlock: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  heroSummaryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  heroExerciseList: {
    gap: 4,
    marginTop: 6,
    marginBottom: 4,
  },
  heroExerciseItem: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  heroExtraExercises: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  cycleBlock: {
    gap: 8,
  },
  cycleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cycleText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cycleBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 6,
    width: '100%',
  },
  cycleBarSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
  },
  cycleBarSegmentActive: {
    backgroundColor: colors.primary,
  },
  cycleBarSegmentInactive: {
    backgroundColor: '#2D2925',
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBigNumber: {
    fontSize: 22,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricUnitText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  metricSmallLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroPrimaryButton: {
    height: 56,
    borderRadius: 28,
    marginTop: 4,
  },
  heroSecondaryLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  heroSecondaryLinkText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  /* ESTADO 4.2: EMPTY STATE */
  emptyCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  emptyGlow: {
    position: 'absolute',
    top: -40,
    left: '50%',
    marginLeft: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 122, 89, 0.06)',
  },
  emptyIllustrationWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pauseBadge: {
    position: 'absolute',
    bottom: 2,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#352F28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  pauseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActions: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  emptyPrimaryButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    borderRadius: radii.pill,
  },
  emptyFreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  emptyFreeText: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },

  /* DICA VOLT */
  dicaVoltCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  dicaVoltIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dicaVoltContent: {
    flex: 1,
    gap: 4,
  },
  dicaVoltHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dicaVoltTag: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  dicaVoltDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  dicaVoltTitle: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
  },
  dicaVoltDescription: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },

  /* IDEIAS POPULARES PARA INICIAR */
  popularSection: {
    gap: 10,
    marginTop: 2,
  },
  popularHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  popularSectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  viewTemplatesLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  popularGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  popularCard: {
    flex: 1,
    height: 112,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  popularCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  popularCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  popularCardTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
  },
  popularCardSubtitle: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    zIndex: 1,
    lineHeight: 16,
  },
  popularCardDecoration: {
    position: 'absolute',
    bottom: -16,
    right: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  /* SEÇÕES DO ESTADO 4.1 */
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  weekBadge: {
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  weekCirclesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: colors.primary,
  },
  dayCircleToday: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCircleDefault: {
    backgroundColor: '#26211C',
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dayNumberTextToday: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitBold,
    fontWeight: '700',
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  dayLabelTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  detailsLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  lastSessionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  lastSessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  lastSessionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2D2925',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lastSessionInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  lastSessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastSessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    flexShrink: 1,
  },
  lastSessionDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  lastSessionDate: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  lastSessionMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lastSessionMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSessionMetricText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  lastSessionChevron: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  noLastSessionCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noLastSessionText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
