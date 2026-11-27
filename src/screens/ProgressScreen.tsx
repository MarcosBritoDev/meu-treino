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
import { colors, radii, spacing, fontFamilies } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  PRBadge,
  EmptyState,
  Button,
  SegmentedControl,
  SegmentOption,
  MuscleIcon,
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
  Flame,
} from 'lucide-react-native';
import {
  getProgressScreenData,
  ProgressScreenData,
  SessionHistoryItem,
  WeightUnit,
  PeriodFilter,
} from '../db/progress';
import { formatarPeso, KG_TO_LB } from '../domain/weight';
import { formatMuscleSeriesCount } from '../domain/progressMath';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TabView = 'resumo' | 'historico' | 'recordes';

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

/** Formata data de cabeçalho de mês: "Novembro de 2026" */
function formatMonthYearHeader(timestamp: number): string {
  const d = new Date(timestamp);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[d.getMonth()]} de ${d.getFullYear()}`;
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
  const [data, setData] = useState<ProgressScreenData | null>(null);
  const [showAllMuscles, setShowAllMuscles] = useState(false);
  const [selectedRoutineFilter, setSelectedRoutineFilter] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadProgressData = useCallback((activePeriod: PeriodFilter = period) => {
    setHasError(false);
    try {
      const result = getProgressScreenData(activePeriod);
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadProgressData(period);
    }, [loadProgressData, period])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    triggerHaptic('light');
    loadProgressData(period);
  }, [loadProgressData, period]);

  const handlePeriodChange = useCallback(
    (newPeriod: PeriodFilter) => {
      if (newPeriod === period) return;
      triggerHaptic('selection');
      setPeriod(newPeriod);
      loadProgressData(newPeriod);
    },
    [period, loadProgressData]
  );

  const tabOptions: SegmentOption<TabView>[] = [
    { label: 'Resumo', value: 'resumo' },
    { label: 'Histórico', value: 'historico' },
    { label: 'Recordes', value: 'recordes' },
  ];

  const unit: WeightUnit = data?.unit || 'kg';

  // Volume máximo da semana para calibração das barras
  const maxWeeklyVol = useMemo(() => {
    if (!data || data.weeklyBars.length === 0) return 1;
    const vols = data.weeklyBars.map((b) => b.volumeKg);
    return Math.max(...vols, 1);
  }, [data]);

  // Contagem de treinos na semana
  const weeklyWorkoutCount = useMemo(() => {
    if (!data) return 0;
    return data.weeklyBars.filter((b) => b.hasWorkout).length;
  }, [data]);

  // Músculo com maior número de séries para cálculo proporcional da barra
  const maxMuscleSets = useMemo(() => {
    if (!data || data.muscleDistribution.length === 0) return 1;
    return data.muscleDistribution[0].sets || 1;
  }, [data]);

  // Músculos visíveis: 4 primeiros para aproximar evolução de força da primeira rolagem
  const visibleMuscles = useMemo(() => {
    if (!data) return [];
    if (showAllMuscles) return data.muscleDistribution;
    return data.muscleDistribution.slice(0, 4);
  }, [data, showAllMuscles]);

  // Lista de rotinas únicas para filtro no histórico
  const routineOptions = useMemo(() => {
    if (!data || data.sessions.length === 0) return ['Todos'];
    const names = Array.from(new Set(data.sessions.map((s) => s.name).filter(Boolean)));
    return ['Todos', ...names];
  }, [data]);

  // Sessões filtradas por rotina
  const filteredSessions = useMemo(() => {
    if (!data) return [];
    if (selectedRoutineFilter === 'Todos') return data.sessions;
    return data.sessions.filter((s) => s.name === selectedRoutineFilter);
  }, [data, selectedRoutineFilter]);

  // Sessões agrupadas por mês e ano para hierarquia escaneável
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: { title: string; sessions: SessionHistoryItem[] } } = {};
    for (const sess of filteredSessions) {
      const ts = sess.endedAt || sess.startedAt;
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          title: formatMonthYearHeader(ts),
          sessions: [],
        };
      }
      groups[key].sessions.push(sess);
    }
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((k) => groups[k]);
  }, [filteredSessions]);

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
            onPress={() => loadProgressData(period)}
            icon={<RotateCcw size={18} color={colors.onPrimary} strokeWidth={1.75} />}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Estado de carregamento inicial
  if (isLoading && !data) {
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

  const hasAnySession = data && data.sessions.length > 0;

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
        {!hasAnySession ? (
          /* EmptyState acionável quando não há treinos concluídos no aplicativo */
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
            {/* 1. Controle segmentado principal: Resumo | Histórico | Recordes */}
            <SegmentedControl
              options={tabOptions}
              value={selectedTab}
              onChange={(val) => setSelectedTab(val)}
              style={styles.segmentedControl}
            />

            {/* ========================================================
                ABA 1: RESUMO
               ======================================================== */}
            {selectedTab === 'resumo' && data && (
              <View style={styles.tabContent}>
                {/* 1.1 CARD SUPERIOR FIXO: Atividade na semana (Seg a Dom · Informativo/Visual) */}
                <Card variant="surface" style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <View style={styles.chartTitleCol}>
                      <View style={styles.chartTitleRow}>
                        <Calendar size={18} color={colors.primary} strokeWidth={1.75} />
                        <Text variant="headline" numberOfLines={1} style={styles.chartTitle}>
                          Atividade na semana
                        </Text>
                      </View>
                      <Text variant="bodySmall" color="secondary" tabular numberOfLines={1}>
                        {`Seg a Dom · ${weeklyWorkoutCount} de ${data.frequencyGoal} na meta`}
                      </Text>
                    </View>

                    {/* Badge de sequência semanal (Streak) enxuto para caber sem quebras em telas estreitas */}
                    {data.weeklyStreak >= 1 && (
                      <View style={styles.streakBadge}>
                        <Flame size={15} color={colors.primary} strokeWidth={2} />
                        <Text
                          variant="labelSmall"
                          tabular
                          style={styles.streakBadgeText}
                          accessibilityLabel={`${data.weeklyStreak} ${
                            data.weeklyStreak === 1 ? 'semana' : 'semanas'
                          } na meta`}
                        >
                          {`${data.weeklyStreak} ${data.weeklyStreak === 1 ? 'sem' : 'sems'}`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 7 colunas puramente visuais/informativas com alto contraste */}
                  <View style={styles.barsContainer}>
                    {data.weeklyBars.map((bar) => {
                      const heightPercent =
                        bar.volumeKg > 0 && maxWeeklyVol > 0
                          ? Math.max(
                              16,
                              Math.min(100, Math.round((bar.volumeKg / maxWeeklyVol) * 100))
                            )
                          : 0;

                      return (
                        <View key={bar.index} style={styles.barCol}>
                          {/* Trilho de alto contraste (#1A1715) sobre a superfície (#23201D) */}
                          <View style={styles.barTrack}>
                            {bar.hasWorkout ? (
                              <View
                                style={[
                                  styles.barFill,
                                  { height: `${heightPercent}%` },
                                  styles.barFillActive,
                                ]}
                              />
                            ) : (
                              /* Marcador sutil de dia de descanso */
                              <View style={styles.barRestMarker} />
                            )}
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

                          {/* Ponto coral discreto abaixo do número apenas no dia de Hoje */}
                          <View style={styles.todayDotContainer}>
                            {bar.isToday && <View style={styles.todayDayDot} />}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Card>

                {/* 1.2 DIVISOR DE CONTEXTO: Cabeçalho discreto para Resumo por período */}
                <View style={styles.periodSectionHeader}>
                  <Text variant="labelSmall" color="secondary" style={styles.periodSectionTitle}>
                    Resumo por período
                  </Text>
                </View>

                {/* 1.3 FILTRO DE PERÍODO: Controla o bloco analítico abaixo */}
                <View style={styles.periodRow}>
                  {(['7d', '30d', 'tudo'] as const).map((p) => {
                    const isSelected = period === p;
                    const label = p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo';
                    return (
                      <Pressable
                        key={p}
                        onPress={() => handlePeriodChange(p)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Filtrar resumo por ${label}`}
                        style={[
                          styles.periodButton,
                          isSelected ? styles.periodButtonActive : styles.periodButtonInactive,
                        ]}
                      >
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.periodButtonText,
                            isSelected ? styles.periodTextActive : styles.periodTextInactive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* 1.4 CARD: Volume acumulado e consistência */}
                <Card variant="surface" style={styles.metricsCard}>
                  <View style={styles.metricsHeader}>
                    <Text variant="bodySmall" color="secondary">
                      Volume acumulado (
                      {period === '7d'
                        ? '7 dias'
                        : period === '30d'
                        ? '30 dias'
                        : 'todo o período'}
                      )
                    </Text>

                    {/* Badge de tendência Δ% com suporte a positivo (+ verde), negativo (- suave) e neutro */}
                    {data.volumeDeltaPercent !== null && (
                      <View
                        style={[
                          styles.deltaBadge,
                          data.volumeDeltaPercent > 0
                            ? styles.deltaBadgePositive
                            : data.volumeDeltaPercent < 0
                            ? styles.deltaBadgeNegative
                            : styles.deltaBadgeNeutral,
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          tabular
                          style={[
                            styles.deltaText,
                            data.volumeDeltaPercent > 0
                              ? styles.deltaTextPositive
                              : data.volumeDeltaPercent < 0
                              ? styles.deltaTextNegative
                              : styles.deltaTextNeutral,
                          ]}
                        >
                          {data.volumeDeltaPercent > 0
                            ? `+${data.volumeDeltaPercent}%`
                            : `${data.volumeDeltaPercent}%`}{' '}
                          vs {period === '7d' ? '7d ant.' : '30d ant.'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Número principal em Outfit Bold tabular + unidade */}
                  <Text variant="displayLarge" tabular style={styles.volumeDisplay}>
                    {formatVolumeDisplay(data.periodVolumeKg, unit)}
                  </Text>

                  <View style={styles.metricsDivider} />

                  {/* Linha inferior com 3 métricas tabulares */}
                  <View style={styles.metricsSubRow}>
                    <View style={styles.subMetricCol}>
                      <Text variant="labelSmall" color="secondary">
                        Treinos
                      </Text>
                      <Text variant="headline" tabular style={styles.subMetricVal}>
                        {data.periodWorkoutCount}
                      </Text>
                    </View>

                    <View style={styles.subMetricVerticalLine} />

                    <View style={styles.subMetricCol}>
                      <Text variant="labelSmall" color="secondary">
                        Séries válidas
                      </Text>
                      <Text variant="headline" tabular style={styles.subMetricVal}>
                        {data.periodValidSetsCount}
                      </Text>
                    </View>

                    <View style={styles.subMetricVerticalLine} />

                    <View style={styles.subMetricCol}>
                      <Text variant="labelSmall" color="secondary">
                        Tempo total
                      </Text>
                      <Text variant="headline" tabular style={styles.subMetricVal}>
                        {formatDurationMinutes(data.periodDurationMin)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* 1.5 CARD: Séries por músculo (primeiros 4 músculos visíveis para compactar rolagem) */}
                <Card variant="surface" style={styles.muscleCard}>
                  <View style={styles.muscleHeader}>
                    <View style={styles.muscleTitleCol}>
                      <Text variant="headline">Séries por músculo</Text>
                      <Text variant="bodySmall" color="secondary">
                        Principal 1× · secundário 0,5× (sem aquecimento)
                      </Text>
                    </View>
                    <View style={styles.muscleCountPill}>
                      <Text variant="labelSmall" tabular style={styles.muscleCountText}>
                        {data.muscleDistribution.length}{' '}
                        {data.muscleDistribution.length === 1 ? 'grupo' : 'grupos'}
                      </Text>
                    </View>
                  </View>

                  {data.muscleDistribution.length === 0 ? (
                    <View style={styles.emptyMuscleContainer}>
                      <Text variant="bodySmall" color="secondary" style={styles.emptyMuscleText}>
                        Nenhuma série válida neste período
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.muscleList}>
                      {visibleMuscles.map((item) => {
                        const percent = Math.max(
                          6,
                          Math.min(100, Math.round((item.sets / maxMuscleSets) * 100))
                        );

                        return (
                          <View key={item.muscle} style={styles.muscleRow}>
                            <View style={styles.muscleIconContainer}>
                              <MuscleIcon muscle={item.muscle} size={22} />
                            </View>

                            <View style={styles.muscleInfoCol}>
                              <View style={styles.muscleLabelRow}>
                                <Text
                                  variant="bodyMedium"
                                  numberOfLines={1}
                                  style={styles.muscleName}
                                >
                                  {item.muscle}
                                </Text>
                                <Text
                                  variant="bodyMedium"
                                  tabular
                                  style={styles.muscleSetsText}
                                >
                                  {formatMuscleSeriesCount(item.sets)}
                                </Text>
                              </View>

                              {/* Barra horizontal proporcional em coral */}
                              <View style={styles.muscleProgressBarTrack}>
                                <View
                                  style={[
                                    styles.muscleProgressBarFill,
                                    { width: `${percent}%` },
                                  ]}
                                />
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {/* Botão Ver todos / Mostrar menos quando houver mais de 4 grupos */}
                      {data.muscleDistribution.length > 4 && (
                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            setShowAllMuscles((prev) => !prev);
                          }}
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel={
                            showAllMuscles
                              ? 'Mostrar menos grupos musculares'
                              : `Ver todos os ${data.muscleDistribution.length} grupos musculares`
                          }
                          style={styles.showMoreMusclesButton}
                        >
                          <Text variant="bodySmall" color="coral" style={styles.showMoreMusclesText}>
                            {showAllMuscles
                              ? 'Mostrar menos'
                              : `Ver todos os músculos (${data.muscleDistribution.length})`}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Card>

                {/* 1.6 BLOCO: Evolução de força (1RM estimado Epley) */}
                {data.strengthProgression.length > 0 && (
                  <View style={styles.strengthSection}>
                    <View style={styles.sectionHeaderCol}>
                      <Text variant="headline">Evolução de força</Text>
                      <Text variant="bodySmall" color="secondary">
                        1RM estimado nos exercícios principais
                      </Text>
                    </View>

                    <Card variant="surface" style={styles.strengthCard}>
                      {data.strengthProgression.map((item, idx) => {
                        const isLast = idx === data.strengthProgression.length - 1;
                        const e1rmDisplay =
                          unit === 'lb'
                            ? `${Math.round(item.currentE1rmKg * KG_TO_LB * 10) / 10} lb`
                            : `${item.currentE1rmKg} kg`;

                        const deltaVal =
                          unit === 'lb'
                            ? Math.round(item.deltaKg * KG_TO_LB * 10) / 10
                            : item.deltaKg;

                        const deltaText =
                          deltaVal > 0 ? `+${deltaVal} ${unit}` : `${deltaVal} ${unit}`;

                        const bestSetText = `${formatarPeso(item.bestWeightKg, unit)} × ${
                          item.bestReps
                        }`;

                        return (
                          <React.Fragment key={item.exerciseId}>
                            <Pressable
                              onPress={() => {
                                triggerHaptic('light');
                                navigation.navigate('ExerciseDetail', {
                                  exerciseId: item.exerciseId,
                                });
                              }}
                              accessible={true}
                              accessibilityRole="button"
                              accessibilityLabel={`Evolução em ${item.name}: 1RM estimado ${e1rmDisplay}, variação ${deltaText}`}
                              style={({ pressed }) => [
                                styles.strengthRow,
                                pressed && styles.strengthRowPressed,
                              ]}
                            >
                              <View style={styles.muscleIconContainer}>
                                <MuscleIcon muscle={item.muscleGroup} size={22} />
                              </View>

                              <View style={styles.strengthInfoCol}>
                                <Text
                                  variant="bodyLarge"
                                  numberOfLines={1}
                                  style={styles.strengthName}
                                >
                                  {item.name}
                                </Text>
                                <Text
                                  variant="bodySmall"
                                  color="secondary"
                                  numberOfLines={1}
                                  style={styles.strengthBestSet}
                                >
                                  Melhor série: {bestSetText}
                                </Text>
                              </View>

                              <View style={styles.strengthRightCol}>
                                <Text
                                  variant="bodyMedium"
                                  tabular
                                  style={styles.strength1RmText}
                                >
                                  1RM est. {e1rmDisplay}
                                </Text>
                                <View style={styles.strengthDeltaRow}>
                                  <Text
                                    variant="labelSmall"
                                    tabular
                                    style={[
                                      styles.strengthDeltaText,
                                      deltaVal > 0
                                        ? styles.deltaPositive
                                        : deltaVal < 0
                                        ? styles.deltaNegative
                                        : styles.deltaZero,
                                    ]}
                                  >
                                    {deltaText}
                                  </Text>
                                  <ChevronRight
                                    size={16}
                                    color={colors.onSurfaceVariant}
                                    strokeWidth={1.75}
                                  />
                                </View>
                              </View>
                            </Pressable>

                            {!isLast && <View style={styles.strengthDivider} />}
                          </React.Fragment>
                        );
                      })}
                    </Card>
                  </View>
                )}

                {/* 1.7 BLOCO: Recordes recentes */}
                {data.prs.length > 0 && (
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

                    {data.prs.slice(0, 2).map((pr) => (
                      <Card
                        key={pr.exerciseId}
                        variant="surface"
                        onPress={() => {
                          triggerHaptic('light');
                          navigation.navigate('ExerciseDetail', {
                            exerciseId: pr.exerciseId,
                          });
                        }}
                        accessibilityLabel={`Recorde em ${pr.exerciseName}: ${formatarPeso(
                          pr.weight,
                          unit
                        )} por ${pr.reps} repetições`}
                        style={styles.previewPrCard}
                      >
                        <View style={styles.prCardHeader}>
                          <View style={styles.prLeftGroup}>
                            <View style={styles.muscleIconContainer}>
                              <MuscleIcon muscle={pr.muscleGroup} size={22} />
                            </View>
                            <View style={styles.prTitleCol}>
                              <Text
                                variant="headline"
                                numberOfLines={1}
                                style={styles.prName}
                              >
                                {pr.exerciseName}
                              </Text>
                              <Text variant="bodySmall" color="secondary">
                                {pr.muscleGroup} {pr.equipment ? `· ${pr.equipment}` : ''}
                              </Text>
                            </View>
                          </View>
                          {/* Âmbar sagrado e exclusivo de PR */}
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
                            <Text
                              variant="labelSmall"
                              color="secondary"
                              tabular
                              style={styles.prE1rmText}
                            >
                              1RM est. {formatarPeso(pr.e1rmKg, unit)}
                            </Text>
                          </View>
                          <ChevronRight
                            size={18}
                            color={colors.onSurfaceVariant}
                            strokeWidth={1.75}
                          />
                        </View>
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ========================================================
                ABA 2: HISTÓRICO DE SESSÕES
               ======================================================== */}
            {selectedTab === 'historico' && data && (
              <View style={styles.tabContent}>
                {/* 2.1 Faixa horizontal de filtros por rotina */}
                {routineOptions.length > 2 && (
                  <View style={styles.routineFilterWrapper}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.routineFilterScroll}
                    >
                      {routineOptions.map((routine) => {
                        const isSelected = selectedRoutineFilter === routine;
                        return (
                          <Pressable
                            key={routine}
                            onPress={() => {
                              triggerHaptic('selection');
                              setSelectedRoutineFilter(routine);
                            }}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`Filtrar por treino ${routine}`}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                            style={[
                              styles.routineChip,
                              isSelected ? styles.routineChipActive : styles.routineChipInactive,
                            ]}
                          >
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.routineChipText,
                                isSelected ? styles.routineChipTextActive : styles.routineChipTextInactive,
                              ]}
                            >
                              {routine}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* 2.2 Lista agrupada por mês e ano */}
                {groupedSessions.length === 0 ? (
                  <View style={styles.emptyFilteredContainer}>
                    <Text variant="bodySmall" color="secondary" style={styles.emptyFilteredText}>
                      Nenhum treino encontrado para "{selectedRoutineFilter}"
                    </Text>
                  </View>
                ) : (
                  groupedSessions.map((group) => (
                    <View key={group.title} style={styles.monthGroup}>
                      <Text variant="labelSmall" color="secondary" style={styles.monthHeaderTitle}>
                        {group.title}
                      </Text>

                      <View style={styles.monthSessionsList}>
                        {group.sessions.map((sess) => (
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
                                <ChevronRight
                                  size={18}
                                  color={colors.onSurfaceVariant}
                                  strokeWidth={1.75}
                                />
                              </View>
                            </View>
                          </Card>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ========================================================
                ABA 3: RECORDES PESSOAIS
               ======================================================== */}
            {selectedTab === 'recordes' && data && (
              <View style={styles.tabContent}>
                {data.prs.length === 0 ? (
                  <EmptyState
                    title="Sem recordes registrados"
                    description="Conclua exercícios para estabelecer suas primeiras marcas de carga máxima."
                    icon={<TrendingUp size={32} color={colors.primary} strokeWidth={1.75} />}
                    style={styles.emptyPrsContainer}
                  />
                ) : (
                  data.prs.map((pr) => (
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
                        <View style={styles.prLeftGroup}>
                          <View style={styles.muscleIconContainer}>
                            <MuscleIcon muscle={pr.muscleGroup} size={22} />
                          </View>
                          <View style={styles.prTitleCol}>
                            <Text variant="headline" numberOfLines={1} style={styles.prName}>
                              {pr.exerciseName}
                            </Text>
                            <Text variant="bodySmall" color="secondary">
                              {pr.muscleGroup} {pr.equipment ? `· ${pr.equipment}` : ''}
                            </Text>
                          </View>
                        </View>
                        {/* Âmbar sagrado e exclusivo de PR */}
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
                          {/* 1RM est. discreto abaixo da carga de PR */}
                          <Text
                            variant="labelSmall"
                            color="secondary"
                            tabular
                            style={styles.prE1rmText}
                          >
                            1RM est. {formatarPeso(pr.e1rmKg, unit)}
                          </Text>
                          <Text variant="labelSmall" color="muted">
                            Conquistado em {formatPrDate(pr.date)}
                          </Text>
                        </View>
                        <ChevronRight
                          size={18}
                          color={colors.onSurfaceVariant}
                          strokeWidth={1.75}
                        />
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

  // Cabeçalho de seção do resumo analítico
  periodSectionHeader: {
    paddingHorizontal: 2,
    marginTop: spacing.xs,
  },
  periodSectionTitle: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 13,
  },

  // Filtro de período com estilo tonal subordinado
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
  },
  periodButtonActive: {
    backgroundColor: colors.primaryContainer, // #3A251F
    borderColor: colors.primary, // Borda coral
  },
  periodButtonInactive: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderColor: colors.outlineVariant, // #3A3531
  },
  periodButtonText: {
    fontFamily: fontFamilies.dmSansMedium,
    textAlign: 'center',
  },
  periodTextActive: {
    color: colors.primary, // #FF7A59
  },
  periodTextInactive: {
    color: colors.onSurfaceVariant, // #B7ADA3
  },

  // Card: Atividade na semana e Streak (Topo do Resumo)
  chartCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chartTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chartTitle: {
    fontSize: 18,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  streakBadgeText: {
    color: colors.primary, // #FF7A59 (nunca âmbar)
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 116,
    paddingTop: spacing.xs,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  barTrack: {
    width: 14,
    height: 64,
    backgroundColor: colors.background, // #1A1715 fundo grafite nítido sobre cartão #23201D
    borderRadius: radii.pill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.pill,
  },
  barFillActive: {
    backgroundColor: colors.primary, // Coral nos dias com treino
  },
  barRestMarker: {
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.outlineVariant, // Marcador mínimo nítido em descanso
    marginBottom: 4,
  },
  barDayLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  barDayLabelToday: {
    color: colors.primary,
    fontFamily: fontFamilies.outfitSemiBold,
  },
  barDayNum: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fontFamilies.outfitSemiBold,
  },
  barDayNumToday: {
    color: colors.primary,
  },
  todayDotContainer: {
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Card: Volume acumulado
  metricsCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deltaBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  deltaBadgePositive: {
    backgroundColor: 'rgba(123, 201, 143, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(123, 201, 143, 0.3)',
  },
  deltaBadgeNegative: {
    backgroundColor: 'rgba(255, 107, 107, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  deltaBadgeNeutral: {
    backgroundColor: 'rgba(183, 173, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(183, 173, 163, 0.25)',
  },
  deltaText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 12,
  },
  deltaTextPositive: {
    color: colors.success, // #7BC98F
  },
  deltaTextNegative: {
    color: colors.error, // #FF6B6B
  },
  deltaTextNeutral: {
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  volumeDisplay: {
    fontSize: 36,
    lineHeight: 42,
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
    fontSize: 18,
  },
  subMetricVerticalLine: {
    width: 1,
    height: 36,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.sm,
  },

  // Card: Séries por músculo
  muscleCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  muscleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  muscleTitleCol: {
    gap: 2,
    flex: 1,
  },
  muscleCountPill: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  muscleCountText: {
    color: colors.onSurfaceVariant,
    fontFamily: fontFamilies.outfitSemiBold,
  },
  emptyMuscleContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMuscleText: {
    textAlign: 'center',
  },
  muscleList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  muscleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleInfoCol: {
    flex: 1,
    gap: 4,
  },
  muscleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleName: {
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
    fontSize: 15,
  },
  muscleSetsText: {
    fontFamily: fontFamilies.outfitSemiBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  muscleProgressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  muscleProgressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
  showMoreMusclesButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  showMoreMusclesText: {
    fontFamily: fontFamilies.dmSansMedium,
  },

  // Bloco: Evolução de força
  strengthSection: {
    gap: spacing.xs,
  },
  sectionHeaderCol: {
    gap: 2,
    paddingHorizontal: 2,
    marginBottom: spacing.xs,
  },
  strengthCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  strengthRowPressed: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.sm,
  },
  strengthInfoCol: {
    flex: 1,
    gap: 2,
  },
  strengthName: {
    fontSize: 16,
    color: colors.onSurface,
  },
  strengthBestSet: {
    fontSize: 13,
  },
  strengthRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  strength1RmText: {
    fontFamily: fontFamilies.outfitBold,
    color: colors.onSurface,
    fontSize: 14,
  },
  strengthDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  strengthDeltaText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 12,
  },
  deltaPositive: {
    color: colors.success, // #7BC98F
  },
  deltaNegative: {
    color: colors.error, // #FF6B6B
  },
  deltaZero: {
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  strengthDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },

  // Bloco: Recordes recentes
  recentPrsSection: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: spacing.xs,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  previewPrCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  prCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  prLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
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
  prE1rmText: {
    fontSize: 12,
    fontFamily: fontFamilies.outfitSemiBold,
  },

  // Filtros de rotina na aba Histórico
  routineFilterWrapper: {
    marginBottom: spacing.xs,
  },
  routineFilterScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  routineChip: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  routineChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  routineChipInactive: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
  },
  routineChipText: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 13,
  },
  routineChipTextActive: {
    color: colors.primary,
  },
  routineChipTextInactive: {
    color: colors.onSurfaceVariant,
  },

  // Agrupamento por mês no Histórico
  monthGroup: {
    gap: spacing.sm,
  },
  monthHeaderTitle: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 13,
    paddingHorizontal: 2,
    marginTop: spacing.xs,
  },
  monthSessionsList: {
    gap: spacing.gutter,
  },
  emptyFilteredContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilteredText: {
    textAlign: 'center',
  },

  // Cards de sessão (Histórico)
  sessionCard: {
    gap: spacing.md,
    minHeight: 80,
    padding: spacing.cardPadding,
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
    padding: spacing.cardPadding,
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
