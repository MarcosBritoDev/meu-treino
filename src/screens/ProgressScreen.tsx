import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography, fontFamilies } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  PRBadge,
  EmptyState,
  Button,
  SegmentedControl,
  SegmentOption,
  Chip,
  triggerHaptic,
} from '../ui';
import {
  TrendingUp,
  Clock,
  Dumbbell,
  Calendar,
  ChevronRight,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';
import { getExpoDb } from '../db/client';
import { getCurrentWeekDays } from '../domain/home';
import { formatarPeso, KG_TO_LB } from '../domain/weight';

type WeightUnit = 'kg' | 'lb';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabView = 'resumo' | 'historico' | 'recordes';
type PeriodFilter = '7d' | '30d' | 'tudo';

interface SessionHistoryItem {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  durationMin: number;
  volumeKg: number;
  hasPr: boolean;
}

interface PRItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  weight: number;
  reps: number;
  date: number;
}

interface DayBarItem {
  index: number;
  label: string;
  dayOfMonth: number;
  volumeKg: number;
  isToday: boolean;
  hasWorkout: boolean;
}

/** Formata minutos para padrão fitness (ex.: "45 min", "1h", "1h 15min") */
function formatDurationMinutes(min: number): string {
  if (min <= 0) return '0 min';
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  const remainingMin = min % 60;
  if (remainingMin === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMin}min`;
}

/** Formata volume com separador de milhar brasileiro */
function formatVolumeDisplay(volumeKg: number, unit: WeightUnit): string {
  const converted = unit === 'lb' ? volumeKg * KG_TO_LB : volumeKg;
  const rounded = Math.round(converted);
  const str = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${str} ${unit}`;
}

/** Formata data para o histórico: "Hoje", "Ontem" ou "24 de out." */
function formatSessionDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday) {
    return 'Hoje';
  }
  if (timestamp >= startOfYesterday) {
    return 'Ontem';
  }

  const day = d.getDate();
  const months = [
    'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
    'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
  ];
  return `${day} de ${months[d.getMonth()]}`;
}

/** Formata data de recorde no formato DD/MM/AAAA */
function formatPrDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [selectedTab, setSelectedTab] = useState<TabView>('resumo');
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [prs, setPrs] = useState<PRItem[]>([]);
  const [weeklyBars, setWeeklyBars] = useState<DayBarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadProgressData = useCallback(() => {
    setHasError(false);
    try {
      const rawDb = getExpoDb();

      // 1. Unidade configurada no app
      const sRows = rawDb.getAllSync<{ unit: string }>(
        'SELECT unit FROM settings WHERE id = 1 LIMIT 1'
      );
      const curUnit: WeightUnit = sRows.length > 0 && sRows[0].unit === 'lb' ? 'lb' : 'kg';
      setUnit(curUnit);

      // 2. Buscar todas as sessões concluídas
      const sessionRows = rawDb.getAllSync<{
        id: string;
        name_snapshot: string;
        started_at: number;
        ended_at: number | null;
        has_pr: number;
      }>(
        `SELECT 
          s.id,
          s.name_snapshot,
          s.started_at,
          s.ended_at,
          EXISTS (
            SELECT 1 
            FROM session_exercises se 
            JOIN sets st ON st.session_exercise_id = se.id
            WHERE se.session_id = s.id 
              AND (st.is_pr_weight = 1 OR st.is_pr_volume = 1)
              AND (st.type IS NULL OR (st.type != 'warmup' AND st.type != 'drop'))
              AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
              AND st.completed_at IS NOT NULL
          ) AS has_pr
         FROM sessions s
         WHERE s.status = 'completed'
         ORDER BY COALESCE(s.ended_at, s.started_at) DESC`
      );

      // 3. Buscar todas as séries concluídas para cálculo de volume
      const setRows = rawDb.getAllSync<{
        session_id: string;
        equipment: string;
        weight: number;
        reps: number;
      }>(
        `SELECT 
          se.session_id,
          e.equipment,
          st.weight,
          st.reps
         FROM session_exercises se
         JOIN exercises e ON se.exercise_id = e.id
         JOIN sets st ON st.session_exercise_id = se.id
         JOIN sessions s ON se.session_id = s.id
         WHERE s.status = 'completed'
           AND st.completed_at IS NOT NULL
           AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
           AND (st.type IS NULL OR st.type != 'warmup')`
      );

      // Mapa de volume total por sessão (Halteres multiplicam por 2)
      const sessionVolumeMap = new Map<string, number>();
      for (const r of setRows) {
        const isDumbbell = (r.equipment || '').trim().toLowerCase() === 'halteres';
        const multiplier = isDumbbell ? 2 : 1;
        const w = Number(r.weight) || 0;
        const reps = Number(r.reps) || 0;
        if (w > 0 && reps > 0) {
          const setVol = w * multiplier * reps;
          const current = sessionVolumeMap.get(r.session_id) || 0;
          sessionVolumeMap.set(r.session_id, current + setVol);
        }
      }

      const sessionList: SessionHistoryItem[] = sessionRows.map((s) => {
        const started = s.started_at;
        const ended = s.ended_at || s.started_at;
        const durMin = Math.max(1, Math.round(Math.max(60000, ended - started) / 60000));
        const vol = sessionVolumeMap.get(s.id) || 0;
        return {
          id: s.id,
          name: s.name_snapshot,
          startedAt: started,
          endedAt: ended,
          durationMin: durMin,
          volumeKg: Math.round(vol * 100) / 100,
          hasPr: Boolean(s.has_pr),
        };
      });

      setSessions(sessionList);

      // 4. Recordes pessoais (PRs) por exercício
      const prRows = rawDb.getAllSync<{
        exercise_id: string;
        exercise_name: string;
        muscle_group: string;
        equipment: string;
        weight: number;
        reps: number;
        completed_at: number | null;
        ended_at: number | null;
        started_at: number;
      }>(
        `SELECT 
          e.id AS exercise_id,
          e.name AS exercise_name,
          e.muscle_group,
          e.equipment,
          st.weight,
          st.reps,
          st.completed_at,
          s.ended_at,
          s.started_at
         FROM sets st
         JOIN session_exercises se ON st.session_exercise_id = se.id
         JOIN exercises e ON se.exercise_id = e.id
         JOIN sessions s ON se.session_id = s.id
         WHERE s.status = 'completed'
           AND st.completed_at IS NOT NULL
           AND st.reps >= 1
           AND st.weight > 0
           AND (st.is_warmup = 0 OR st.is_warmup IS NULL)
           AND (st.type IS NULL OR (st.type != 'warmup' AND st.type != 'drop'))
         ORDER BY e.name ASC, st.weight DESC, st.reps DESC, st.completed_at ASC`
      );

      const prMap = new Map<string, PRItem>();
      for (const r of prRows) {
        if (!prMap.has(r.exercise_id)) {
          prMap.set(r.exercise_id, {
            exerciseId: r.exercise_id,
            exerciseName: r.exercise_name,
            muscleGroup: r.muscle_group,
            equipment: r.equipment,
            weight: r.weight,
            reps: r.reps,
            date: r.completed_at || r.ended_at || r.started_at,
          });
        }
      }
      const prList = Array.from(prMap.values()).sort((a, b) => b.date - a.date);
      setPrs(prList);

      // 5. Gráfico semanal compacto de barras (Seg a Dom)
      const weekDays = getCurrentWeekDays();
      const dayBars: DayBarItem[] = weekDays.map((wd) => {
        const daysSessions = sessionList.filter((sess) => {
          const time = sess.endedAt || sess.startedAt;
          return time >= wd.startOfDay && time <= wd.endOfDay;
        });
        const dayVol = daysSessions.reduce((acc, curr) => acc + curr.volumeKg, 0);
        return {
          index: wd.index,
          label: wd.label,
          dayOfMonth: wd.dayOfMonth,
          volumeKg: dayVol,
          isToday: wd.isToday,
          hasWorkout: daysSessions.length > 0,
        };
      });
      setWeeklyBars(dayBars);
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgressData();
    }, [loadProgressData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    triggerHaptic('light');
    loadProgressData();
  }, [loadProgressData]);

  // Filtro de período para as métricas do resumo
  const filteredSessions = useMemo(() => {
    if (period === '7d') {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return sessions.filter((s) => s.endedAt >= cutoff);
    }
    if (period === '30d') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return sessions.filter((s) => s.endedAt >= cutoff);
    }
    return sessions;
  }, [sessions, period]);

  const totalPeriodVolume = useMemo(() => {
    return filteredSessions.reduce((acc, curr) => acc + curr.volumeKg, 0);
  }, [filteredSessions]);

  const totalPeriodDuration = useMemo(() => {
    return filteredSessions.reduce((acc, curr) => acc + curr.durationMin, 0);
  }, [filteredSessions]);

  const maxWeeklyVol = useMemo(() => {
    const vols = weeklyBars.map((b) => b.volumeKg);
    return Math.max(...vols, 1);
  }, [weeklyBars]);

  const weeklyWorkoutCount = useMemo(() => {
    return weeklyBars.filter((b) => b.hasWorkout).length;
  }, [weeklyBars]);

  const tabOptions: SegmentOption<TabView>[] = [
    { label: 'Resumo', value: 'resumo' },
    { label: 'Histórico', value: 'historico' },
    { label: 'Recordes', value: 'recordes' },
  ];

  // Estado de erro amigável com botão de retry
  if (hasError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Progresso"
          onOpenSettings={() => navigation.navigate('Ajustes')}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <AlertCircle size={32} color={colors.error} strokeWidth={1.75} />
          </View>
          <Text variant="headline" style={styles.errorTitle}>
            Falha ao carregar dados
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.errorDescription}>
            Não foi possível ler o histórico de treinos. Seus dados continuam seguros no dispositivo.
          </Text>
          <Button
            title="Tentar novamente"
            variant="primary"
            onPress={() => loadProgressData()}
            icon={<RotateCcw size={18} color={colors.onPrimary} strokeWidth={1.75} />}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Estado de carregamento inicial
  if (isLoading && sessions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Progresso"
          onOpenSettings={() => navigation.navigate('Ajustes')}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodySmall" color="secondary" style={styles.loadingText}>
            Carregando evolução...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Progresso"
        onOpenSettings={() => navigation.navigate('Ajustes')}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.tabBarHeight + insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceContainerHigh}
          />
        }
      >
        {sessions.length === 0 ? (
          /* EmptyState acionável quando não há treinos concluídos */
          <EmptyState
            title="Sem treinos registrados"
            description="Conclua seu primeiro treino para acompanhar volume, histórico e recordes de carga."
            icon={<TrendingUp size={32} color={colors.primary} strokeWidth={1.75} />}
            primaryAction={{
              title: 'Iniciar um treino',
              onPress: () => {
                triggerHaptic('medium');
                (navigation as any).navigate('Treinos');
              },
            }}
            style={styles.emptyContainer}
          />
        ) : (
          <>
            {/* Alternador superior: Resumo | Histórico | Recordes */}
            <SegmentedControl
              options={tabOptions}
              value={selectedTab}
              onChange={(val) => setSelectedTab(val)}
              style={styles.segmentedControl}
            />

            {/* ABA 1: RESUMO */}
            {selectedTab === 'resumo' && (
              <View style={styles.tabContent}>
                {/* Filtro de período */}
                <View style={styles.periodRow}>
                  <Chip
                    label="7 dias"
                    selected={period === '7d'}
                    onPress={() => setPeriod('7d')}
                    style={styles.periodChip}
                  />
                  <Chip
                    label="30 dias"
                    selected={period === '30d'}
                    onPress={() => setPeriod('30d')}
                    style={styles.periodChip}
                  />
                  <Chip
                    label="Tudo"
                    selected={period === 'tudo'}
                    onPress={() => setPeriod('tudo')}
                    style={styles.periodChip}
                  />
                </View>

                {/* Card principal de volume no período */}
                <Card variant="surface" style={styles.metricsCard}>
                  <View style={styles.metricsHeader}>
                    <Text variant="bodySmall" color="secondary">
                      Volume acumulado ({period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'todo o período'})
                    </Text>
                    <View style={styles.unitPill}>
                      <Text variant="labelSmall" color="secondary" style={styles.unitText}>
                        {unit}
                      </Text>
                    </View>
                  </View>

                  <Text variant="displayLarge" tabular style={styles.volumeDisplay}>
                    {formatVolumeDisplay(totalPeriodVolume, unit)}
                  </Text>

                  <View style={styles.metricsDivider} />

                  <View style={styles.metricsSubRow}>
                    <View style={styles.subMetricCol}>
                      <Text variant="bodySmall" color="secondary">
                        Treinos
                      </Text>
                      <Text variant="headline" tabular style={styles.subMetricVal}>
                        {filteredSessions.length}
                      </Text>
                    </View>

                    <View style={styles.subMetricVerticalLine} />

                    <View style={styles.subMetricCol}>
                      <Text variant="bodySmall" color="secondary">
                        Tempo total
                      </Text>
                      <Text variant="headline" tabular style={styles.subMetricVal}>
                        {formatDurationMinutes(totalPeriodDuration)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Gráfico de barras dos últimos 7 dias (Seg a Dom) */}
                <Card variant="surface" style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleRow}>
                      <Calendar size={18} color={colors.primary} strokeWidth={1.75} />
                      <Text variant="headline" style={styles.chartTitle}>
                        Atividade na semana
                      </Text>
                    </View>
                    <Text variant="bodySmall" color="secondary" tabular>
                      {weeklyWorkoutCount} {weeklyWorkoutCount === 1 ? 'treino' : 'treinos'}
                    </Text>
                  </View>

                  <View style={styles.barsContainer}>
                    {weeklyBars.map((bar) => {
                      const heightPercent =
                        bar.volumeKg > 0 && maxWeeklyVol > 0
                          ? Math.max(16, Math.min(100, Math.round((bar.volumeKg / maxWeeklyVol) * 100)))
                          : 6;

                      return (
                        <View
                          key={bar.index}
                          style={styles.barCol}
                          accessible={true}
                          accessibilityLabel={`${bar.label}, dia ${bar.dayOfMonth}: ${
                            bar.hasWorkout ? formatVolumeDisplay(bar.volumeKg, unit) : 'sem treino'
                          }`}
                        >
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                { height: `${heightPercent}%` },
                                bar.hasWorkout ? styles.barActive : styles.barInactive,
                              ]}
                            />
                          </View>
                          <Text
                            variant="labelSmall"
                            style={[
                              styles.barDayLabel,
                              bar.isToday && styles.barDayLabelToday,
                            ]}
                          >
                            {bar.label}
                          </Text>
                          <Text
                            variant="bodySmall"
                            tabular
                            style={[
                              styles.barDayNum,
                              bar.isToday && styles.barDayNumToday,
                            ]}
                          >
                            {bar.dayOfMonth}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>

                {/* Prévia de recordes recentes se houver */}
                {prs.length > 0 && (
                  <View style={styles.recentPrsSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text variant="headline">Recordes recentes</Text>
                      <Pressable
                        onPress={() => {
                          triggerHaptic('selection');
                          setSelectedTab('recordes');
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Ver todos os recordes pessoais"
                        style={styles.seeAllButton}
                      >
                        <Text variant="bodySmall" color="coral">
                          Ver todos
                        </Text>
                        <ChevronRight size={16} color={colors.primary} strokeWidth={1.75} />
                      </Pressable>
                    </View>

                    {prs.slice(0, 2).map((pr) => (
                      <Card
                        key={pr.exerciseId}
                        variant="surface"
                        onPress={() => {
                          triggerHaptic('light');
                          navigation.navigate('ExerciseDetail', { exerciseId: pr.exerciseId });
                        }}
                        accessibilityLabel={`Recorde em ${pr.exerciseName}: ${formatarPeso(pr.weight, unit)} por ${pr.reps} repetições`}
                        style={styles.previewPrCard}
                      >
                        <View style={styles.prCardHeader}>
                          <View style={styles.prTitleCol}>
                            <Text variant="headline" numberOfLines={1} style={styles.prName}>
                              {pr.exerciseName}
                            </Text>
                            <Text variant="bodySmall" color="secondary">
                              {pr.muscleGroup} {pr.equipment ? `· ${pr.equipment}` : ''}
                            </Text>
                          </View>
                          <PRBadge label="Recorde" />
                        </View>

                        <View style={styles.prCardFooter}>
                          <Text variant="headline" tabular style={styles.prLoadText}>
                            {formatarPeso(pr.weight, unit)}{' '}
                            <Text variant="bodyMedium" color="secondary">
                              ×
                            </Text>{' '}
                            {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
                          </Text>
                          <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                        </View>
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ABA 2: HISTÓRICO */}
            {selectedTab === 'historico' && (
              <View style={styles.tabContent}>
                {sessions.map((sess) => (
                  <Card
                    key={sess.id}
                    variant="surface"
                    onPress={() => {
                      triggerHaptic('light');
                      navigation.navigate('SessionDetail', { sessionId: sess.id });
                    }}
                    accessibilityLabel={`Treino ${sess.name}, realizado em ${formatSessionDate(
                      sess.endedAt || sess.startedAt
                    )}`}
                    style={styles.sessionCard}
                  >
                    <View style={styles.sessionHeaderRow}>
                      <Text variant="headline" numberOfLines={1} style={styles.sessionName}>
                        {sess.name}
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        {formatSessionDate(sess.endedAt || sess.startedAt)}
                      </Text>
                    </View>

                    <View style={styles.sessionFooterRow}>
                      <View style={styles.sessionStatsRow}>
                        <View style={styles.metaItem}>
                          <Clock size={15} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                          <Text variant="bodySmall" color="secondary" tabular>
                            {formatDurationMinutes(sess.durationMin)}
                          </Text>
                        </View>

                        <View style={styles.metaDot} />

                        <View style={styles.metaItem}>
                          <Dumbbell size={15} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                          <Text variant="bodySmall" color="secondary" tabular>
                            {formatVolumeDisplay(sess.volumeKg, unit)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.sessionRightActions}>
                        {sess.hasPr && <PRBadge label="Recorde" style={styles.sessionPrBadge} />}
                        <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* ABA 3: RECORDES PESSOAIS */}
            {selectedTab === 'recordes' && (
              <View style={styles.tabContent}>
                {prs.length === 0 ? (
                  <EmptyState
                    title="Sem recordes registrados"
                    description="Conclua exercícios para estabelecer suas primeiras marcas de carga máxima."
                    icon={<TrendingUp size={32} color={colors.primary} strokeWidth={1.75} />}
                    style={styles.emptyPrsContainer}
                  />
                ) : (
                  prs.map((pr) => (
                    <Card
                      key={pr.exerciseId}
                      variant="surface"
                      onPress={() => {
                        triggerHaptic('light');
                        navigation.navigate('ExerciseDetail', { exerciseId: pr.exerciseId });
                      }}
                      accessibilityLabel={`Recorde em ${pr.exerciseName}: ${formatarPeso(
                        pr.weight,
                        unit
                      )} por ${pr.reps} repetições`}
                      style={styles.prCard}
                    >
                      <View style={styles.prCardHeader}>
                        <View style={styles.prTitleCol}>
                          <Text variant="headline" numberOfLines={1} style={styles.prName}>
                            {pr.exerciseName}
                          </Text>
                          <Text variant="bodySmall" color="secondary">
                            {pr.muscleGroup} {pr.equipment ? `· ${pr.equipment}` : ''}
                          </Text>
                        </View>
                        <PRBadge label="Recorde" />
                      </View>

                      <View style={styles.prCardFooter}>
                        <View style={styles.prStatsCol}>
                          <Text variant="headline" tabular style={styles.prLoadText}>
                            {formatarPeso(pr.weight, unit)}{' '}
                            <Text variant="bodyMedium" color="secondary">
                              ×
                            </Text>{' '}
                            {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
                          </Text>
                          <Text variant="labelSmall" color="muted">
                            Conquistado em {formatPrDate(pr.date)}
                          </Text>
                        </View>
                        <ChevronRight size={18} color={colors.onSurfaceVariant} strokeWidth={1.75} />
                      </View>
                    </Card>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    gap: spacing.gutter,
  },
  segmentedControl: {
    marginBottom: spacing.xs,
  },
  tabContent: {
    gap: spacing.gutter,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodChip: {
    flex: 1,
  },
  // Card principal de métricas de volume
  metricsCard: {
    gap: spacing.sm,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitPill: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  unitText: {
    fontFamily: typography.labelSmall.fontFamily,
  },
  volumeDisplay: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
  },
  metricsDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.xs,
  },
  metricsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subMetricCol: {
    flex: 1,
    gap: 2,
  },
  subMetricVal: {
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
  },
  subMetricVerticalLine: {
    width: 1,
    height: 36,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.md,
  },
  // Gráfico semanal de barras
  chartCard: {
    gap: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartTitle: {
    fontSize: 18,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    paddingTop: spacing.xs,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTrack: {
    width: 12,
    height: 64,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radii.pill,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.pill,
  },
  barActive: {
    backgroundColor: colors.primary,
  },
  barInactive: {
    backgroundColor: colors.outlineVariant,
  },
  barDayLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  barDayLabelToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  barDayNum: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamilies.outfitSemiBold,
  },
  barDayNumToday: {
    color: colors.primary,
  },
  // Seção de recordes recentes
  recentPrsSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: spacing.touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  previewPrCard: {
    gap: spacing.sm,
  },
  // Cards de sessão (Histórico)
  sessionCard: {
    gap: spacing.md,
    minHeight: 80,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionName: {
    flex: 1,
    marginRight: spacing.sm,
    fontSize: 17,
  },
  sessionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.outline,
  },
  sessionRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionPrBadge: {
    alignSelf: 'center',
  },
  // Cards de Recordes Pessoais
  prCard: {
    gap: spacing.sm,
    minHeight: 84,
  },
  prCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  prTitleCol: {
    flex: 1,
    gap: 2,
  },
  prName: {
    fontSize: 17,
  },
  prCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  prStatsCol: {
    gap: 2,
  },
  prLoadText: {
    fontSize: 20,
    color: colors.onSurface,
  },
  // Estados de erro e carregamento
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    gap: spacing.md,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: '#3A2020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorDescription: {
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    width: '100%',
    maxWidth: 280,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    textAlign: 'center',
  },
  emptyContainer: {
    marginTop: spacing.xl,
  },
  emptyPrsContainer: {
    paddingVertical: spacing.xl,
  },
});
