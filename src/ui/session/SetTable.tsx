import React, { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Check,
  PlusCircle,
  ArrowUpDown,
  MoreHorizontal,
  Trophy,
  X,
} from 'lucide-react-native';
import { C, F } from './tokens';
import { GRID } from './grid';
import {
  RPE_OPTIONS,
  Unit,
  formatRpe,
  formatWeight,
  rowStates,
  setLabels,
  RowState,
} from '../../domain/sessionMath';

export interface SetVM {
  id: string;
  weightKg: number; // sempre kg; conversão na exibição
  reps: number;
  rpe: number | null;
  isWarmup: boolean;
  isFailure?: boolean;
  completedAt: number | null;
  isPr: boolean;
}

export interface PreviousVM {
  weightKg: number;
  reps: number;
  rpe?: number | null;
}

export interface TargetVM {
  weightKg?: number;
  reps?: number;
  repsMin?: number;
  repsMax?: number;
  note?: string;
}

export interface SetTableProps {
  sets: SetVM[];
  previous: (PreviousVM | null)[];
  targets?: (TargetVM | null)[];
  unit: Unit;
  openRpeId?: string | null;
  onToggle: (setId: string) => void;
  onEditWeight: (setId: string) => void;
  onEditReps: (setId: string) => void;
  onOpenMenu: (setId: string) => void;
  onToggleRpe?: (setId: string) => void;
  onCloseRpe?: () => void;
  onChangeRpe?: (setId: string, rpe: number) => void;
  onAddSet: () => void;
  onSwapExercise?: () => void;
  onOpenExerciseOptions?: () => void;
}

export function SetTable(p: SetTableProps) {
  const labels = setLabels(p.sets);
  const states = rowStates(p.sets);

  return (
    <View style={s.tableContainer}>
      {/* CABEÇALHO DE 6 COLUNAS (STITCH) */}
      <View style={s.header} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[s.headText, { width: GRID.serie }]}>Série</Text>
        <Text style={[s.headText, s.colFlex]}>Anterior</Text>
        <Text style={[s.headText, s.colFlex]}>Alvo</Text>
        <Text style={[s.headText, { width: GRID.kg, textAlign: 'center' }]}>{p.unit}</Text>
        <Text style={[s.headText, { width: GRID.reps, textAlign: 'center' }]}>Reps</Text>
        <View style={{ width: GRID.check, alignItems: 'center' }}>
          <Check size={13} color={C.headerText} strokeWidth={2.4} />
        </View>
      </View>

      {/* LINHAS DA TABELA */}
      <View style={s.rowsContainer}>
        {p.sets.map((set, i) => (
          <View key={set.id}>
            <SetRow
              set={set}
              label={labels[i]}
              state={states[i]}
              previous={p.previous[i] ?? null}
              target={p.targets ? p.targets[i] ?? null : null}
              unit={p.unit}
              onToggle={p.onToggle}
              onEditWeight={p.onEditWeight}
              onEditReps={p.onEditReps}
              onOpenMenu={p.onOpenMenu}
              onToggleRpe={p.onToggleRpe}
            />

            {/* FAIXA DE RPE (QUANDO EXPANDIDA MANUALMENTE) */}
            {Boolean(p.openRpeId && p.openRpeId === set.id && set.completedAt !== null && p.onChangeRpe) && (
              <RpeStrip
                value={set.rpe}
                onChange={(v) => {
                  p.onChangeRpe?.(set.id, v);
                  p.onCloseRpe ? p.onCloseRpe() : p.onToggleRpe?.(set.id);
                }}
                onClose={() => (p.onCloseRpe ? p.onCloseRpe() : p.onToggleRpe?.(set.id))}
              />
            )}
          </View>
        ))}
      </View>

      {/* RODAPÉ DO EXERCÍCIO (STITCH): + Adicionar série, ⇅ Substituir, ••• */}
      <View style={s.footerRow}>
        <View style={s.footerLeft}>
          <Pressable
            onPress={p.onAddSet}
            style={({ pressed }) => [s.footerBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar série"
          >
            <PlusCircle size={15} color="#E5E5EA" strokeWidth={2.2} />
            <Text style={s.footerBtnText}>Adicionar série</Text>
          </Pressable>

          {Boolean(p.onSwapExercise) && (
            <Pressable
              onPress={p.onSwapExercise}
              style={({ pressed }) => [s.footerBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Substituir exercício"
            >
              <ArrowUpDown size={15} color="#E5E5EA" strokeWidth={2.2} />
              <Text style={s.footerBtnText}>Substituir</Text>
            </Pressable>
          )}
        </View>

        {Boolean(p.onOpenExerciseOptions) && (
          <Pressable
            onPress={p.onOpenExerciseOptions}
            style={({ pressed }) => [s.moreBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mais opções do exercício"
          >
            <MoreHorizontal size={20} color="#8E8E93" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface SetRowProps {
  set: SetVM;
  label: string;
  state: RowState;
  previous: PreviousVM | null;
  target: TargetVM | null;
  unit: Unit;
  onToggle: (id: string) => void;
  onEditWeight: (id: string) => void;
  onEditReps: (id: string) => void;
  onOpenMenu: (id: string) => void;
  onToggleRpe?: (id: string) => void;
}

const SetRow = memo(function SetRow({
  set,
  label,
  state,
  previous,
  target,
  unit,
  onToggle,
  onEditWeight,
  onEditReps,
  onOpenMenu,
  onToggleRpe,
}: SetRowProps) {
  const done = state === 'done';
  const current = state === 'current';

  const prevPrimary = previous
    ? `${formatWeight(previous.weightKg, unit)} ${unit} × ${previous.reps}`
    : '—';
  const prevSub = previous?.rpe ? `RPE ${formatRpe(previous.rpe)}` : (previous ? '—' : '');

  const targetWeight = target?.weightKg !== undefined ? target.weightKg : set.weightKg;
  const targetReps = target?.reps !== undefined ? target.reps : set.reps;
  const targetPrimary = `${formatWeight(targetWeight, unit)} ${unit} × ${targetReps}`;
  const targetSub = target?.note || (target?.repsMin && target?.repsMax ? `${target.repsMin}-${target.repsMax} reps` : '');

  return (
    <View style={[s.row, done && s.rowDone, current && s.rowCurrent]}>
      {/* 1. SÉRIE (Badge ou Número) */}
      <Pressable
        style={s.cellSerie}
        onPress={() => done && onToggleRpe?.(set.id)}
        onLongPress={() => onOpenMenu(set.id)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={set.isWarmup ? 'Série de aquecimento' : `Série ${label}`}
        accessibilityHint="Toque longo para opções da série"
      >
        {set.isWarmup ? (
          <View style={s.warmupBadge}>
            <Text style={s.warmupBadgeText}>W</Text>
          </View>
        ) : set.isFailure ? (
          <View style={s.failureBadge}>
            <Text style={s.failureBadgeText}>F</Text>
          </View>
        ) : (
          <Text style={[s.serieNumText, current && s.serieNumCurrent]}>{label}</Text>
        )}

        {set.isPr && (
          <View style={s.prDot} accessibilityLabel="Novo recorde">
            <Trophy size={9} color="#000000" strokeWidth={2.6} />
          </View>
        )}
      </Pressable>

      {/* 2. ANTERIOR (2 linhas) */}
      <Pressable
        style={s.cellPrev}
        onPress={() => done && onToggleRpe?.(set.id)}
      >
        <Text style={s.statPrimaryText} numberOfLines={1}>
          {prevPrimary}
        </Text>
        {Boolean(prevSub) && (
          <Text style={s.statSubText} numberOfLines={1}>
            {prevSub}
          </Text>
        )}
      </Pressable>

      {/* 3. ALVO (2 linhas) */}
      <View style={s.cellTarget}>
        <Text style={s.statPrimaryText} numberOfLines={1}>
          {targetPrimary}
        </Text>
        {Boolean(targetSub) && (
          <Text style={s.statSubText} numberOfLines={1}>
            {targetSub}
          </Text>
        )}
      </View>

      {/* 4. CARGA (Caixa de input #242426) */}
      <Pressable
        style={s.cellBox}
        onPress={() => onEditWeight(set.id)}
        accessibilityRole="button"
        accessibilityLabel={`Carga ${formatWeight(set.weightKg, unit)} ${unit}. Toque para alterar`}
      >
        <Text style={[s.boxText, done && s.boxTextDone]}>
          {formatWeight(set.weightKg, unit)}
        </Text>
      </Pressable>

      {/* 5. REPS (Caixa de input #242426 com Micro-Badge RPE) */}
      <Pressable
        style={s.cellBox}
        onPress={() => onEditReps(set.id)}
        accessibilityRole="button"
        accessibilityLabel={`${set.reps} repetições. Toque para alterar`}
      >
        <Text style={[s.boxText, done && s.boxTextDone]}>{set.reps}</Text>

        {/* Micro-badge no canto inferior direito */}
        {set.rpe !== null && (
          <View style={s.rpeMicroBadge}>
            <Text style={s.rpeMicroText}>{formatRpe(set.rpe)}</Text>
          </View>
        )}
      </Pressable>

      {/* 6. CHECKMARK (Círculo 28x28 Stitch) */}
      <Pressable
        style={s.cellCheck}
        onPress={() => onToggle(set.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Desmarcar série ${label}` : `Concluir série ${label}`}
      >
        <View style={[s.checkCircle, done ? s.checkCircleDone : current ? s.checkCircleCurrent : s.checkCirclePending]}>
          <Check
            size={15}
            color={done ? '#000000' : current ? C.goldAccent : '#525257'}
            strokeWidth={done ? 3 : 2.4}
          />
        </View>
      </Pressable>
    </View>
  );
});

function RpeStrip({
  value,
  onChange,
  onClose,
}: {
  value: number | null;
  onChange: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <View style={s.rpeWrap}>
      <Pressable onPress={onClose} style={s.rpeLabelButton} hitSlop={8}>
        <Text style={s.rpeLabel}>RPE</Text>
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.rpeScroll}
        style={{ flex: 1 }}
      >
        {RPE_OPTIONS.map((v) => {
          const sel = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              style={[s.rpeChip, sel && s.rpeChipSel]}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`RPE ${formatRpe(v)}`}
            >
              <Text style={[s.rpeChipText, sel && s.rpeChipTextSel]}>{formatRpe(v)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={onClose}
        style={s.rpeCloseBtn}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Fechar faixa de RPE"
      >
        <X size={18} color={C.muted} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  tableContainer: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  headText: {
    fontFamily: F.bodyMedium,
    fontSize: 11,
    color: '#7C7C80',
  },
  colFlex: {
    flex: 1.1,
    paddingHorizontal: 4,
  },
  rowsContainer: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: GRID.rowHeight,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  rowDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  rowCurrent: {
    backgroundColor: 'rgba(245, 166, 35, 0.05)',
  },

  cellSerie: {
    width: GRID.serie,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  serieNumText: {
    fontFamily: F.number,
    fontSize: 13,
    color: '#A1A1A6',
    paddingLeft: 4,
  },
  serieNumCurrent: {
    color: C.goldAccent,
    fontWeight: '700',
  },
  warmupBadge: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#423414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmupBadgeText: {
    fontSize: 11,
    fontFamily: F.numberBold,
    color: '#F5C451',
  },
  failureBadge: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#4E2424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureBadgeText: {
    fontSize: 11,
    fontFamily: F.numberBold,
    color: '#FF8585',
  },
  prDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cellPrev: {
    flex: 1.1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cellTarget: {
    flex: 1.1,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  statPrimaryText: {
    fontFamily: F.bodyMedium,
    fontSize: 12,
    color: '#E5E5EA',
    lineHeight: 16,
  },
  statSubText: {
    fontFamily: F.body,
    fontSize: 10.5,
    color: '#8E8E93',
    lineHeight: 14,
  },

  cellBox: {
    width: GRID.kg,
    height: 32,
    backgroundColor: '#242426',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 3,
  },
  boxText: {
    fontFamily: F.numberBold,
    fontSize: 13,
    color: '#E5E5EA',
    fontVariant: ['tabular-nums'],
  },
  boxTextDone: {
    color: '#FFFFFF',
  },

  rpeMicroBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#3A3A3C',
    borderRadius: 8,
    paddingHorizontal: 3,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242426',
  },
  rpeMicroText: {
    fontSize: 8.5,
    fontFamily: F.numberBold,
    color: '#D1D1D6',
  },

  cellCheck: {
    width: GRID.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCirclePending: {
    backgroundColor: '#272729',
  },
  checkCircleCurrent: {
    backgroundColor: '#272729',
    borderWidth: 1.5,
    borderColor: C.goldAccent,
  },
  checkCircleDone: {
    backgroundColor: '#F5A623',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerBtnText: {
    fontFamily: F.bodyMedium,
    fontSize: 13,
    color: '#E5E5EA',
  },
  moreBtn: {
    padding: 4,
  },

  rpeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    marginTop: 4,
  },
  rpeLabelButton: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  rpeLabel: {
    fontFamily: F.bodyMedium,
    fontSize: 11,
    color: C.muted,
  },
  rpeScroll: {
    gap: 6,
    paddingRight: 8,
  },
  rpeChip: {
    height: 32,
    minWidth: 40,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#242426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeChipSel: {
    backgroundColor: '#F5A623',
  },
  rpeChipText: {
    fontFamily: F.bodyMedium,
    fontSize: 12,
    color: '#A1A1A6',
    fontVariant: ['tabular-nums'],
  },
  rpeChipTextSel: {
    color: '#000000',
    fontWeight: '700',
  },
  rpeCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
