import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';

export interface DateRangeResult {
  startTs: number;
  endTs: number;
  label: string;
}

export interface DateRangePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (range: DateRangeResult) => void;
  initialStartTs?: number | null;
  initialEndTs?: number | null;
}

/** Retorna o início do dia local em milissegundos (00:00:00.000) */
export function getStartOfDay(year: number, month: number, day: number): number {
  return new Date(year, month, day, 0, 0, 0, 0).getTime();
}

/** Retorna o fim do dia local em milissegundos (23:59:59.999) */
export function getEndOfDay(year: number, month: number, day: number): number {
  return new Date(year, month, day, 23, 59, 59, 999).getTime();
}

/** Formata intervalo de datas em formato compacto (ex.: "01 out – 31 out", "15 nov") */
export function formatCompactDateRange(startTs: number, endTs: number): string {
  const dStart = new Date(startTs);
  const dEnd = new Date(endTs);
  const months = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];
  const dayStart = String(dStart.getDate()).padStart(2, '0');
  const dayEnd = String(dEnd.getDate()).padStart(2, '0');
  const mStart = months[dStart.getMonth()];
  const mEnd = months[dEnd.getMonth()];

  if (dStart.getFullYear() !== dEnd.getFullYear()) {
    return `${dayStart} ${mStart}/${dStart.getFullYear()} – ${dayEnd} ${mEnd}/${dEnd.getFullYear()}`;
  }
  if (dayStart === dayEnd && mStart === mEnd) {
    return `${dayStart} ${mStart}`;
  }
  if (mStart === mEnd) {
    return `${dayStart} – ${dayEnd} ${mStart}`;
  }
  return `${dayStart} ${mStart} – ${dayEnd} ${mEnd}`;
}

/** Nomes dos meses em português do Brasil */
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Dias da semana iniciando em Segunda-feira (padrão de musculação no Brasil) */
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const DateRangePickerSheet: React.FC<DateRangePickerSheetProps> = ({
  visible,
  onClose,
  onApply,
  initialStartTs,
  initialEndTs,
}) => {
  const insets = useSafeAreaInsets();
  const now = useMemo(() => new Date(), []);
  const todayEnd = useMemo(
    () => getEndOfDay(now.getFullYear(), now.getMonth(), now.getDate()),
    [now]
  );
  const todayStart = useMemo(
    () => getStartOfDay(now.getFullYear(), now.getMonth(), now.getDate()),
    [now]
  );

  // Mês e ano atualmente exibidos no calendário
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Datas selecionadas temporariamente no sheet
  const [selectedStart, setSelectedStart] = useState<number | null>(initialStartTs ?? null);
  const [selectedEnd, setSelectedEnd] = useState<number | null>(initialEndTs ?? null);

  // Sincroniza com as props quando o sheet abre
  useEffect(() => {
    if (visible) {
      if (initialStartTs && initialEndTs) {
        setSelectedStart(initialStartTs);
        setSelectedEnd(initialEndTs);
        const d = new Date(initialEndTs);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      } else {
        // Padrão: mês atual
        const start = getStartOfDay(now.getFullYear(), now.getMonth(), 1);
        const end = getEndOfDay(now.getFullYear(), now.getMonth(), now.getDate());
        setSelectedStart(start);
        setSelectedEnd(end);
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }
    }
  }, [visible, initialStartTs, initialEndTs, now]);

  // Gesto de deslizar para baixo para fechar
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 60) {
            triggerHaptic('light');
            onClose();
          }
        },
      }),
    [onClose]
  );

  // Navegação entre meses
  const handlePrevMonth = useCallback(() => {
    triggerHaptic('selection');
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const canGoNextMonth = useMemo(() => {
    if (viewYear < now.getFullYear()) return true;
    if (viewYear === now.getFullYear() && viewMonth < now.getMonth()) return true;
    return false;
  }, [viewYear, viewMonth, now]);

  const handleNextMonth = useCallback(() => {
    if (!canGoNextMonth) return;
    triggerHaptic('selection');
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, [canGoNextMonth]);

  // Dias do mês atual em exibição
  const daysInMonth = useMemo(
    () => new Date(viewYear, viewMonth + 1, 0).getDate(),
    [viewYear, viewMonth]
  );

  // Offset de início (0 = Segunda, 6 = Domingo)
  const firstDayWeekdayOffset = useMemo(() => {
    const jsDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Dom, 1 = Seg...
    return (jsDay + 6) % 7;
  }, [viewYear, viewMonth]);

  // Lista de dias renderizáveis
  const calendarCells = useMemo(() => {
    const cells: Array<{
      day: number | null;
      startTs: number;
      endTs: number;
      isFuture: boolean;
      isToday: boolean;
    }> = [];

    // Células em branco antes do primeiro dia
    for (let i = 0; i < firstDayWeekdayOffset; i++) {
      cells.push({
        day: null,
        startTs: 0,
        endTs: 0,
        isFuture: false,
        isToday: false,
      });
    }

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const sTs = getStartOfDay(viewYear, viewMonth, d);
      const eTs = getEndOfDay(viewYear, viewMonth, d);
      const isFuture = sTs > todayEnd;
      const isToday = sTs === todayStart;

      cells.push({
        day: d,
        startTs: sTs,
        endTs: eTs,
        isFuture,
        isToday,
      });
    }

    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDayWeekdayOffset, todayEnd, todayStart]);

  // Ação de toque em um dia
  const handleDayPress = useCallback(
    (cellStartTs: number, cellEndTs: number) => {
      triggerHaptic('selection');

      // Se nenhum ou ambos já foram selecionados, o próximo toque redefine o início
      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(cellStartTs);
        setSelectedEnd(null);
        return;
      }

      // Se apenas o início estava selecionado, o 2º toque define o fim
      if (cellStartTs < selectedStart) {
        // Inverte se clicou em data anterior para nunca gerar intervalo inválido
        setSelectedEnd(getEndOfDay(new Date(selectedStart).getFullYear(), new Date(selectedStart).getMonth(), new Date(selectedStart).getDate()));
        setSelectedStart(cellStartTs);
      } else {
        setSelectedEnd(cellEndTs);
      }
    },
    [selectedStart, selectedEnd]
  );

  // Atalhos de visão ampla
  const applyPreset = useCallback(
    (preset: 'mesAtual' | 'mesPassado' | 'ultimos6Meses' | 'esteAno') => {
      triggerHaptic('medium');
      let start = 0;
      let end = 0;

      if (preset === 'mesAtual') {
        start = getStartOfDay(now.getFullYear(), now.getMonth(), 1);
        end = getEndOfDay(now.getFullYear(), now.getMonth(), now.getDate());
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      } else if (preset === 'mesPassado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        start = getStartOfDay(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
        end = getEndOfDay(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), lastDayPrevMonth);
        setViewYear(prevMonthDate.getFullYear());
        setViewMonth(prevMonthDate.getMonth());
      } else if (preset === 'ultimos6Meses') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        start = getStartOfDay(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1);
        end = getEndOfDay(now.getFullYear(), now.getMonth(), now.getDate());
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      } else if (preset === 'esteAno') {
        start = getStartOfDay(now.getFullYear(), 0, 1);
        end = getEndOfDay(now.getFullYear(), now.getMonth(), now.getDate());
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }

      setSelectedStart(start);
      setSelectedEnd(end);
    },
    [now]
  );

  // Cálculo da quantidade de dias selecionados
  const selectionSummary = useMemo(() => {
    if (!selectedStart) {
      return 'Selecione uma data no calendário';
    }
    const end = selectedEnd || getEndOfDay(new Date(selectedStart).getFullYear(), new Date(selectedStart).getMonth(), new Date(selectedStart).getDate());
    const d1 = new Date(selectedStart);
    const d2 = new Date(end);
    const m1 = getStartOfDay(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const m2 = getStartOfDay(d2.getFullYear(), d2.getMonth(), d2.getDate());
    const diffDays = Math.round((m2 - m1) / (24 * 60 * 60 * 1000)) + 1;

    return `${diffDays} ${diffDays === 1 ? 'dia selecionado' : 'dias selecionados'} (${formatCompactDateRange(selectedStart, end)})`;
  }, [selectedStart, selectedEnd]);

  const handleApply = useCallback(() => {
    if (!selectedStart) return;
    const finalEnd = selectedEnd || getEndOfDay(new Date(selectedStart).getFullYear(), new Date(selectedStart).getMonth(), new Date(selectedStart).getDate());
    const label = formatCompactDateRange(selectedStart, finalEnd);

    triggerHaptic('medium');
    onApply({
      startTs: selectedStart,
      endTs: finalEnd,
      label,
    });
    onClose();
  }, [selectedStart, selectedEnd, onApply, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Fundo preto 65% que fecha ao toque */}
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            triggerHaptic('light');
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Fechar painel de datas"
        />

        {/* Conteúdo do Bottom Sheet com raio 28px no topo */}
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(spacing.lg, insets.bottom + 8) },
          ]}
        >
          {/* Alça de arrastar (Drag Handle) */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Cabeçalho do Sheet */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Calendar size={20} color={colors.primary} strokeWidth={1.75} />
              <Text variant="headline" style={styles.titleText}>
                Selecionar período
              </Text>
            </View>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeButton}
            >
              <X size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Camada A: Atalhos de visão ampla (1 toque) */}
            <View style={styles.presetsSection}>
              <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
                Atalhos rápidos
              </Text>
              <View style={styles.presetsRow}>
                <Pressable
                  onPress={() => applyPreset('mesAtual')}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar mês atual"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={styles.presetChip}
                >
                  <Text variant="bodySmall" style={styles.presetText}>
                    Mês atual
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => applyPreset('mesPassado')}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar mês passado"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={styles.presetChip}
                >
                  <Text variant="bodySmall" style={styles.presetText}>
                    Mês passado
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => applyPreset('ultimos6Meses')}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar últimos 6 meses"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={styles.presetChip}
                >
                  <Text variant="bodySmall" style={styles.presetText}>
                    Últimos 6 meses
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => applyPreset('esteAno')}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar este ano"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  style={styles.presetChip}
                >
                  <Text variant="bodySmall" style={styles.presetText}>
                    Este ano
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Camada B: Calendário mensal interativo */}
            <View style={styles.calendarSection}>
              {/* Barra de navegação do mês */}
              <View style={styles.monthNavRow}>
                <Pressable
                  onPress={handlePrevMonth}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Mês anterior"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.navArrowButton}
                >
                  <ChevronLeft size={22} color={colors.onSurface} strokeWidth={1.75} />
                </Pressable>

                <Text variant="headline" tabular style={styles.monthTitleText}>
                  {`${MONTH_NAMES[viewMonth]} de ${viewYear}`}
                </Text>

                <Pressable
                  onPress={handleNextMonth}
                  disabled={!canGoNextMonth}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Próximo mês"
                  accessibilityState={{ disabled: !canGoNextMonth }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.navArrowButton,
                    !canGoNextMonth && styles.navArrowDisabled,
                  ]}
                >
                  <ChevronRight
                    size={22}
                    color={canGoNextMonth ? colors.onSurface : colors.textMuted}
                    strokeWidth={1.75}
                  />
                </Pressable>
              </View>

              {/* Cabeçalho dos dias da semana (Seg a Dom) */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={styles.weekdayCol}>
                    <Text variant="labelSmall" color="secondary" style={styles.weekdayText}>
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grade de dias */}
              <View style={styles.daysGrid}>
                {calendarCells.map((cell, idx) => {
                  if (cell.day === null) {
                    return <View key={`empty-${idx}`} style={styles.dayCol} />;
                  }

                  const effectiveEnd = selectedEnd || selectedStart;
                  const isStart = selectedStart !== null && cell.startTs === selectedStart;
                  const isEnd = effectiveEnd !== null && cell.endTs === effectiveEnd;
                  const isInBetween =
                    selectedStart !== null &&
                    effectiveEnd !== null &&
                    cell.startTs > selectedStart &&
                    cell.endTs < effectiveEnd;

                  return (
                    <View key={`day-${cell.startTs}`} style={styles.dayCol}>
                      {/* Faixa tonal de preenchimento para dias no meio do intervalo */}
                      {isInBetween && <View style={styles.rangeMiddleBand} />}
                      {isStart && selectedEnd !== null && selectedEnd > selectedStart && (
                        <View style={styles.rangeStartBand} />
                      )}
                      {isEnd && selectedStart !== null && selectedEnd !== null && selectedEnd > selectedStart && (
                        <View style={styles.rangeEndBand} />
                      )}

                      <Pressable
                        onPress={() => handleDayPress(cell.startTs, cell.endTs)}
                        disabled={cell.isFuture}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Dia ${cell.day} de ${MONTH_NAMES[viewMonth]}${
                          cell.isToday ? ', hoje' : ''
                        }`}
                        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                        style={[
                          styles.dayButton,
                          (isStart || isEnd) && styles.dayButtonEndpoint,
                          cell.isFuture && styles.dayButtonDisabled,
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          tabular
                          style={[
                            styles.dayText,
                            (isStart || isEnd) && styles.dayTextEndpoint,
                            isInBetween && styles.dayTextInRange,
                            cell.isFuture && styles.dayTextDisabled,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </Pressable>

                      {/* Indicador sutil de 'Hoje' */}
                      {cell.isToday && !isStart && !isEnd && (
                        <View style={styles.calendarTodayDot} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Rodapé fixo com resumo e botão Aplicar */}
          <View style={styles.footer}>
            <View style={styles.footerSummaryBox}>
              <Text
                variant="bodySmall"
                color="secondary"
                numberOfLines={1}
                tabular
                style={styles.summaryText}
              >
                {selectionSummary}
              </Text>
            </View>

            <Pressable
              onPress={handleApply}
              disabled={!selectedStart}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Aplicar período selecionado"
              accessibilityState={{ disabled: !selectedStart }}
              style={[
                styles.applyButton,
                !selectedStart && styles.applyButtonDisabled,
              ]}
            >
              <Text variant="bodyLarge" style={styles.applyButtonText}>
                Aplicar período
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay, // #000000 a 65%
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    maxHeight: '92%',
  },
  handleArea: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.outlineVariant,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: 19,
    color: colors.onSurface,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },

  // Atalhos rápidos
  presetsSection: {
    gap: spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetText: {
    fontFamily: fontFamilies.dmSansMedium,
    color: colors.onSurface,
    fontSize: 13,
  },

  // Calendário
  calendarSection: {
    backgroundColor: colors.surfaceContainerLow, // #1F1B19
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  navArrowButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.35,
  },
  monthTitleText: {
    fontSize: 16,
    color: colors.onSurface,
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: spacing.xs,
  },
  dayCol: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rangeMiddleBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 4,
    backgroundColor: colors.primaryContainer, // #3A251F
  },
  rangeStartBand: {
    position: 'absolute',
    left: '50%',
    right: 0,
    top: 4,
    bottom: 4,
    backgroundColor: colors.primaryContainer, // #3A251F
  },
  rangeEndBand: {
    position: 'absolute',
    left: 0,
    right: '50%',
    top: 4,
    bottom: 4,
    backgroundColor: colors.primaryContainer, // #3A251F
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dayButtonEndpoint: {
    backgroundColor: colors.primary, // Círculo coral #FF7A59 no início e no fim
  },
  dayButtonDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  dayTextEndpoint: {
    color: colors.onPrimary, // #1A1715
    fontFamily: fontFamilies.outfitBold,
  },
  dayTextInRange: {
    color: colors.onSurface,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  calendarTodayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Rodapé fixo
  footer: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerSummaryBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  summaryText: {
    color: colors.onSurfaceVariant,
  },
  applyButton: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary, // #FF7A59
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  applyButtonDisabled: {
    opacity: 0.45,
  },
  applyButtonText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 17,
    color: colors.onPrimary, // #1A1715
  },
});
