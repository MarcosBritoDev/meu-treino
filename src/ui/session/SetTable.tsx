import React, { memo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  PlusCircle,
  ArrowUpDown,
  MoreHorizontal,
  MoreVertical,
  Trophy,
  X,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react-native';
import { C, F } from './tokens';
import { GRID } from './grid';
import {
  Unit,
  SetType,
  RepsMode,
  EffortMode,
  formatWeight,
  rowStates,
  setLabels,
  RowState,
  formatRepsTarget,
  formatRepsShort,
  formatEffort,
  formatTarget,
  getSetDisplayLabel,
  canPerformSetAction,
} from '../../domain/sessionMath';
import { triggerHaptic } from '../haptics';

export interface SetVM {
  id: string;
  weightKg?: number; // active mode: sempre kg; conversão na exibição
  weight?: number;
  reps?: number;
  rpe?: number | null;
  isWarmup?: boolean;
  isFailure?: boolean;
  completedAt?: number | null;
  isPr?: boolean;

  // Propriedades de séries planejadas (preview/ativo)
  type?: SetType | string;
  repsMode?: RepsMode | string;
  reps_mode?: RepsMode | string;
  minReps?: number | null;
  min_reps?: number | null;
  maxReps?: number | null;
  max_reps?: number | null;
  effortMode?: EffortMode | string;
  effort_mode?: EffortMode | string;
  effortValue?: number | null;
  effort_value?: number | null;
  effortValueMax?: number | null;
  effort_value_max?: number | null;
  effortRefExerciseId?: string | null;
  effort_ref_exercise_id?: string | null;
  rest?: number | null;
  rest_s?: number | null;
  position?: number;
  is_session_only?: boolean | number;
  completed?: boolean;
  previous?: PreviousVM | { weightKg?: number; weight?: number; reps: number; rpe?: number | null } | null;
  drop_percent?: number | null;
  dropPercent?: number | null;
  manual_weight?: boolean;
  manualWeight?: boolean;
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

export type SetMenuAction = 'duplicate' | 'up' | 'down' | 'remove';

export interface SetTableProps {
  mode?: 'preview' | 'active';
  sets: SetVM[];
  unit: Unit;

  // Props exclusivas do modo preview
  onRowClick?: (set: SetVM, badgeLabel: string) => void;
  onMenuAction?: (action: SetMenuAction, setId: string) => void;
  refExerciseName?: (refExId: string) => string | undefined;

  // Props do modo ativo / compartilhadas
  previous?: (PreviousVM | null)[];
  targets?: (TargetVM | null)[];
  onToggle?: (setId: string) => void;
  onEditWeight?: (setId: string) => void;
  onEditReps?: (setId: string) => void;
  onActiveChange?: (setId: string, field: 'weight' | 'reps', value: any) => void;
  onOpenMenu?: (setId: string) => void;
  onAddSet?: () => void;
  onSwapExercise?: () => void;
  onOpenExerciseOptions?: () => void;
}

export function SetTable(p: SetTableProps) {
  const mode = p.mode ?? 'active';
  const [activeMenuSetId, setActiveMenuSetId] = useState<string | null>(null);

  // ==========================================================================
  // 1. MODO PRÉVIA (4 COLUNAS: Série | Meta | Reps | ⋮ — SEM PESO, SEM CHECK)
  // ==========================================================================
  if (mode === 'preview') {
    const activeMenuIndex = activeMenuSetId
      ? p.sets.findIndex((s) => s.id === activeMenuSetId)
      : -1;
    const canMoveUp =
      activeMenuIndex > 0 && canPerformSetAction(p.sets, 'up', activeMenuIndex);
    const canMoveDown =
      activeMenuIndex >= 0 &&
      activeMenuIndex < p.sets.length - 1 &&
      canPerformSetAction(p.sets, 'down', activeMenuIndex);
    const canRemove =
      activeMenuIndex >= 0 && canPerformSetAction(p.sets, 'remove', activeMenuIndex);

    return (
      <View style={s.tableContainer}>
        {/* Cabeçalho de 4 colunas */}
        <View
          style={s.previewHeader}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[s.headText, s.previewColSerie]}>Série</Text>
          <Text style={[s.headText, s.previewColMeta]}>Meta</Text>
          <Text style={[s.headText, s.previewColReps]}>Reps</Text>
          <View style={s.previewColAction} />
        </View>

        {/* Linhas da prévia */}
        <View style={s.previewRowsContainer}>
          {p.sets.map((set, i) => {
            const badgeLabel = getSetDisplayLabel(p.sets, i);
            const setType = (set.type ||
              (set.isWarmup ? 'warmup' : set.isFailure ? 'failure' : 'normal')) as string;
            const repsTarget = formatRepsTarget(set);
            const refExerciseId = set.effortRefExerciseId ?? set.effort_ref_exercise_id;
            const refName = refExerciseId
              ? p.refExerciseName?.(refExerciseId)
              : undefined;
            const effort =
              setType === 'normal' || setType === 'drop' || (!setType && !set.isWarmup && !set.isFailure)
                ? formatTarget(set, p.unit, refName)
                : '';
            const repsShort = formatRepsShort(set);

            return (
              <View key={set.id} style={s.previewRowWrap}>
                <Pressable
                  style={({ pressed }) => [
                    s.previewRow,
                    pressed && s.previewRowPressed,
                  ]}
                  onPress={() => p.onRowClick?.(set, badgeLabel)}
                  accessibilityRole="button"
                  accessibilityLabel={`Série ${badgeLabel}, meta ${repsTarget}${
                    effort ? ', ' + effort : ''
                  }`}
                >
                  {/* 1. SÉRIE BADGE */}
                  <View style={s.previewColSerie}>
                    <View
                      style={[
                        s.previewBadgeBase,
                        setType === 'warmup' && s.badgeWarmup,
                        setType === 'failure' && s.badgeFailure,
                        setType === 'drop' && s.badgeDrop,
                        (setType === 'normal' || (!setType && !set.isWarmup)) &&
                          s.badgeNormal,
                      ]}
                    >
                      <Text
                        style={[
                          s.previewBadgeText,
                          setType === 'warmup' && s.badgeTextWarmup,
                          setType === 'failure' && s.badgeTextFailure,
                          setType === 'drop' && s.badgeTextDrop,
                          (setType === 'normal' || (!setType && !set.isWarmup)) &&
                            s.badgeTextNormal,
                        ]}
                      >
                        {badgeLabel}
                      </Text>
                    </View>
                  </View>

                  {/* 2. META (2 LINHAS) */}
                  <View style={s.previewColMeta}>
                    <Text style={s.previewMetaPrimary} numberOfLines={1}>
                      {repsTarget}
                    </Text>
                    {Boolean(effort) && (
                      <Text style={s.previewMetaSub} numberOfLines={1}>
                        {effort}
                      </Text>
                    )}
                  </View>

                  {/* 3. REPS (Pill) */}
                  <View style={s.previewColReps}>
                    <View style={s.previewRepsPill}>
                      <Text style={s.previewRepsText} numberOfLines={1}>
                        {repsShort}
                      </Text>
                    </View>
                  </View>

                  {/* 4. AÇÃO (⋮) */}
                  <View style={s.previewColAction}>
                    <Pressable
                      style={({ pressed }) => [
                        s.previewMenuBtn,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={() => setActiveMenuSetId(set.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Opções da série ${badgeLabel}`}
                    >
                      <MoreVertical size={16} color="#8E8E93" />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Rodapé da prévia (se onAddSet fornecido) */}
        {Boolean(p.onAddSet) && (
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
            </View>
          </View>
        )}

        {/* Menu Contextual Modal para Ações da Série (Duplicar, Mover, Remover) */}
        {activeMenuSetId !== null && (
          <Modal
            transparent
            visible={activeMenuSetId !== null}
            animationType="fade"
            onRequestClose={() => setActiveMenuSetId(null)}
          >
            <Pressable
              style={s.menuModalOverlay}
              onPress={() => setActiveMenuSetId(null)}
            >
              <View style={s.menuModalContent}>
                <Pressable
                  style={({ pressed }) => [
                    s.menuItem,
                    pressed && s.menuItemPressed,
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    p.onMenuAction?.('duplicate', activeMenuSetId);
                    setActiveMenuSetId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Duplicar série"
                >
                  <Copy size={16} color="#E5E5EA" />
                  <Text style={s.menuItemText}>Duplicar</Text>
                </Pressable>

                <Pressable
                  disabled={!canMoveUp}
                  style={({ pressed }) => [
                    s.menuItem,
                    !canMoveUp && s.menuItemDisabled,
                    pressed && canMoveUp && s.menuItemPressed,
                  ]}
                  onPress={() => {
                    if (!canMoveUp) return;
                    triggerHaptic('light');
                    p.onMenuAction?.('up', activeMenuSetId);
                    setActiveMenuSetId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveUp }}
                  accessibilityLabel="Mover série para cima"
                >
                  <ArrowUp
                    size={16}
                    color={!canMoveUp ? '#525257' : '#E5E5EA'}
                  />
                  <Text
                    style={[
                      s.menuItemText,
                      !canMoveUp && s.menuItemTextDisabled,
                    ]}
                  >
                    Mover acima
                  </Text>
                </Pressable>

                <Pressable
                  disabled={!canMoveDown}
                  style={({ pressed }) => [
                    s.menuItem,
                    !canMoveDown && s.menuItemDisabled,
                    pressed && canMoveDown && s.menuItemPressed,
                  ]}
                  onPress={() => {
                    if (!canMoveDown) return;
                    triggerHaptic('light');
                    p.onMenuAction?.('down', activeMenuSetId);
                    setActiveMenuSetId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canMoveDown }}
                  accessibilityLabel="Mover série para baixo"
                >
                  <ArrowDown
                    size={16}
                    color={!canMoveDown ? '#525257' : '#E5E5EA'}
                  />
                  <Text
                    style={[
                      s.menuItemText,
                      !canMoveDown && s.menuItemTextDisabled,
                    ]}
                  >
                    Mover abaixo
                  </Text>
                </Pressable>

                <View style={s.menuDivider} />

                <Pressable
                  disabled={!canRemove}
                  style={({ pressed }) => [
                    s.menuItem,
                    !canRemove && s.menuItemDisabled,
                    pressed && canRemove && s.menuItemDangerPressed,
                  ]}
                  onPress={() => {
                    if (!canRemove) return;
                    triggerHaptic('medium');
                    p.onMenuAction?.('remove', activeMenuSetId);
                    setActiveMenuSetId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canRemove }}
                  accessibilityLabel="Remover série"
                >
                  <Trash2
                    size={16}
                    color={!canRemove ? '#525257' : '#FF6B6B'}
                  />
                  <Text
                    style={[
                      s.menuItemDangerText,
                      !canRemove && s.menuItemTextDisabled,
                    ]}
                  >
                    Remover
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        )}
      </View>
    );
  }

  // ==========================================================================
  // 2. MODO ATIVO (6 COLUNAS COMPACTAS: Série | Anterior | Meta | kg/lb | Reps | ✓)
  // ==========================================================================
  const states = rowStates(
    p.sets.map((s) => ({ completedAt: s.completedAt ?? null }))
  );
  const previousList = p.previous ?? [];

  return (
    <View style={s.tableContainer}>
      {/* CABEÇALHO DE 6 COLUNAS COMPACTAS */}
      <View
        style={s.activeHeader}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[s.headText, s.activeColSerie]}>Série</Text>
        <Text style={[s.headText, s.activeColPrev]}>Anterior</Text>
        <Text style={[s.headText, s.activeColMeta]}>Meta</Text>
        <Text style={[s.headText, s.activeColWeight]}>{p.unit}</Text>
        <Text style={[s.headText, s.activeColReps]}>Reps</Text>
        <View style={s.activeColCheck}>
          <Check size={12} color="#7C7C80" strokeWidth={2.4} />
        </View>
      </View>

      {/* LINHAS DA TABELA */}
      <View style={s.activeRowsContainer}>
        {p.sets.map((set, i) => {
          const badgeLabel = getSetDisplayLabel(p.sets, i);
          const prevItem = previousList[i] ?? (set as any).previous ?? null;

          return (
            <SetRow
              key={set.id}
              set={set}
              label={badgeLabel}
              state={states[i]}
              previous={prevItem}
              target={null}
              unit={p.unit}
              onToggle={p.onToggle}
              onEditWeight={p.onEditWeight}
              onEditReps={p.onEditReps}
              onActiveChange={p.onActiveChange}
              onOpenMenu={p.onOpenMenu}
              refExerciseName={p.refExerciseName}
            />
          );
        })}
      </View>

      {/* RODAPÉ DO EXERCÍCIO (STITCH): + Adicionar série, ⇅ Substituir, ••• */}
      <View style={s.footerRow}>
        <View style={s.footerLeft}>
          {Boolean(p.onAddSet) && (
            <Pressable
              onPress={p.onAddSet}
              style={({ pressed }) => [s.footerBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Adicionar série"
            >
              <PlusCircle size={15} color="#E5E5EA" strokeWidth={2.2} />
              <Text style={s.footerBtnText}>Adicionar série</Text>
            </Pressable>
          )}

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
  previous: PreviousVM | { weightKg?: number; weight?: number; reps: number; rpe?: number | null } | null;
  target?: TargetVM | null;
  unit: Unit;
  onToggle?: (id: string) => void;
  onEditWeight?: (id: string) => void;
  onEditReps?: (id: string) => void;
  onActiveChange?: (setId: string, field: 'weight' | 'reps', value: any) => void;
  onOpenMenu?: (id: string) => void;
  refExerciseName?: (refExId: string) => string | undefined;
}

const SetRow = memo(function SetRow({
  set,
  label,
  state,
  previous,
  unit,
  onToggle,
  onEditWeight,
  onEditReps,
  onActiveChange,
  refExerciseName,
}: SetRowProps) {
  const done = state === 'done';
  const current = state === 'current';

  const setType = (set.type ||
    (set.isWarmup ? 'warmup' : set.isFailure ? 'failure' : 'normal')) as string;

  // 1. Anterior: apenas carga × reps, sem RPE
  const prevWeight = previous
    ? (previous as any).weightKg ?? (previous as any).weight
    : null;
  const prevText =
    previous && prevWeight !== null && prevWeight !== undefined
      ? `${formatWeight(prevWeight, unit)} ${unit} × ${previous.reps}`
      : '—';

  // 2. Meta: formatRepsTarget na 1ª linha e formatEffort na 2ª linha
  const repsTarget = formatRepsTarget(set);
  const refExerciseId = set.effortRefExerciseId ?? set.effort_ref_exercise_id;
  const refName = refExerciseId ? refExerciseName?.(refExerciseId) : undefined;
  const effort =
    setType === 'normal' || setType === 'drop' || (!setType && !set.isWarmup && !set.isFailure)
      ? (setType === 'drop' ? formatTarget(set, unit, refName) : formatEffort(set, unit, refName))
      : '';

  const isManualDrop = setType === 'drop' && Boolean(set.manual_weight || (set as any).manualWeight);
  const rawWeight = set.weightKg ?? (set as any).weight;
  const displayWeight = rawWeight !== null && rawWeight !== undefined ? formatWeight(rawWeight, unit) : '';
  const displayReps = set.reps !== null && set.reps !== undefined ? String(set.reps) : '';

  return (
    <View style={[s.activeRow, done && s.activeRowDone, current && s.activeRowCurrent]}>
      {/* 1. SÉRIE BADGE */}
      <View style={s.activeColSerie}>
        <View
          style={[
            s.previewBadgeBase,
            setType === 'warmup' && s.badgeWarmup,
            setType === 'failure' && s.badgeFailure,
            setType === 'drop' && s.badgeDrop,
            (setType === 'normal' || (!setType && !set.isWarmup)) && s.badgeNormal,
          ]}
        >
          <Text
            style={[
              s.previewBadgeText,
              setType === 'warmup' && s.badgeTextWarmup,
              setType === 'failure' && s.badgeTextFailure,
              setType === 'drop' && s.badgeTextDrop,
              (setType === 'normal' || (!setType && !set.isWarmup)) && s.badgeTextNormal,
            ]}
          >
            {label}
          </Text>
        </View>
        {Boolean(set.is_session_only) && (
          <Text style={s.sessionOnlyTag}>sessão</Text>
        )}
        {Boolean(set.isPr) && (
          <View style={s.prDot} accessibilityLabel="Novo recorde">
            <Trophy size={9} color="#000000" strokeWidth={2.6} />
          </View>
        )}
      </View>

      {/* 2. ANTERIOR (Apenas carga × reps, sem RPE realizado) */}
      <View style={s.activeColPrev}>
        <Text style={[s.activeStatPrimary, prevText === '—' && s.statEmptyText]} numberOfLines={1}>
          {prevText}
        </Text>
      </View>

      {/* 3. META (1ª linha: reps, 2ª linha: esforço) */}
      <View style={s.activeColMeta}>
        <Text style={s.activeStatPrimary} numberOfLines={1}>
          {repsTarget}
        </Text>
        {Boolean(effort) && (
          <Text style={s.metaEffortText} numberOfLines={1}>
            {effort}
          </Text>
        )}
      </View>

      {/* 4. CARGA (kg ou lb) */}
      <View style={s.activeColWeight}>
        <TextInput
          value={displayWeight === '—' ? '' : displayWeight}
          onChangeText={(val) => onActiveChange?.(set.id, 'weight', val)}
          onFocus={() => onEditWeight?.(set.id)}
          placeholder="0"
          placeholderTextColor="#525257"
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={[
            s.activeBoxInput,
            done && s.activeBoxInputDone,
            isManualDrop && s.activeBoxInputManualDrop,
          ]}
          accessibilityLabel={`Carga ${displayWeight} ${unit}`}
        />
      </View>

      {/* 5. REPS (sem mini-badge de RPE) */}
      <View style={s.activeColReps}>
        <TextInput
          value={displayReps}
          onChangeText={(val) => onActiveChange?.(set.id, 'reps', val)}
          onFocus={() => onEditReps?.(set.id)}
          placeholder="0"
          placeholderTextColor="#525257"
          keyboardType="numeric"
          selectTextOnFocus
          style={[s.activeBoxInput, done && s.activeBoxInputDone]}
          accessibilityLabel={`${displayReps} repetições`}
        />
      </View>

      {/* 6. CHECKMARK (Conclusão direta, sem barra de RPE) */}
      <View style={s.activeColCheck}>
        <Pressable
          style={[s.checkCircle, done ? s.checkCircleDone : s.checkCirclePending]}
          onPress={() => onToggle?.(set.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Desmarcar série ${label}` : `Concluir série ${label}`}
        >
          <Check
            size={14}
            color={done ? '#000000' : '#8E8E93'}
            strokeWidth={done ? 3 : 2.4}
          />
        </Pressable>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  tableContainer: {
    width: '100%',
  },

  // --------------------------------------------------------------------------
  // Prévia (4 Colunas)
  // --------------------------------------------------------------------------
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  previewColSerie: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewColMeta: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  previewColReps: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewColAction: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRowsContainer: {
    gap: 4,
  },
  previewRowWrap: {
    borderRadius: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  previewRowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  previewBadgeBase: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    fontSize: 12,
    fontFamily: F.numberBold,
    fontWeight: '700',
  },
  badgeWarmup: {
    backgroundColor: 'rgba(255, 122, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.35)',
  },
  badgeTextWarmup: {
    color: '#FF7A59',
  },
  badgeFailure: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  badgeTextFailure: {
    color: '#FF6B6B',
  },
  badgeDrop: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.35)',
  },
  badgeTextDrop: {
    color: '#C084FC',
  },
  badgeNormal: {
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
  },
  badgeTextNormal: {
    color: '#F5EFE8',
  },
  previewMetaPrimary: {
    fontFamily: F.bodyMedium,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F5EFE8',
    lineHeight: 16,
  },
  previewMetaSub: {
    fontFamily: F.body,
    fontSize: 11,
    color: '#B7ADA3',
    lineHeight: 14,
    marginTop: 1,
  },
  previewRepsPill: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: '#38332F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRepsText: {
    fontFamily: F.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  previewMenuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --------------------------------------------------------------------------
  // Menu Contextual Modal
  // --------------------------------------------------------------------------
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menuModalContent: {
    width: 220,
    backgroundColor: '#23201D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38332F',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5EFE8',
  },
  menuItemTextDisabled: {
    color: '#7D746B',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#2D2925',
    marginVertical: 4,
  },
  menuItemDangerPressed: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  menuItemDangerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B6B',
  },

  // --------------------------------------------------------------------------
  // Ativo (6 Colunas Compactas)
  // --------------------------------------------------------------------------
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  activeRowsContainer: {
    gap: 4,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 8,
    minHeight: 44,
  },
  activeRowDone: {
    backgroundColor: 'rgba(255, 122, 89, 0.08)',
  },
  activeRowCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeColSerie: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColPrev: {
    flex: 1,
    minWidth: 58,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  activeColMeta: {
    flex: 1,
    minWidth: 58,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  activeColWeight: {
    width: 52,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColReps: {
    width: 46,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColCheck: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStatPrimary: {
    fontFamily: F.bodyMedium,
    fontSize: 11,
    color: '#F5EFE8',
    lineHeight: 14,
  },
  statEmptyText: {
    color: '#7D746B',
  },
  metaEffortText: {
    fontFamily: F.body,
    fontSize: 10,
    color: '#B7ADA3',
    lineHeight: 13,
    marginTop: 1,
  },
  sessionOnlyTag: {
    fontSize: 8,
    fontFamily: F.bodyMedium,
    color: '#38BDF8',
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },
  activeBoxInput: {
    width: '100%',
    height: 30,
    backgroundColor: '#23201D',
    borderWidth: 1,
    borderColor: '#38332F',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: F.number,
    fontWeight: '600',
    color: '#F5EFE8',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  activeBoxInputDone: {
    borderColor: 'rgba(255, 122, 89, 0.4)',
  },
  activeBoxInputManualDrop: {
    borderColor: '#C084FC',
    borderWidth: 1.5,
    backgroundColor: 'rgba(192, 132, 252, 0.08)',
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
    color: '#7D746B',
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
    backgroundColor: 'rgba(255, 122, 89, 0.05)',
  },

  cellSerie: {
    width: GRID.serie,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  serieNumText: {
    fontFamily: F.number,
    fontSize: 13,
    color: '#F5EFE8',
    paddingLeft: 4,
  },
  serieNumCurrent: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  warmupBadge: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmupBadgeText: {
    fontSize: 11,
    fontFamily: F.numberBold,
    color: '#FF7A59',
  },
  failureBadge: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureBadgeText: {
    fontSize: 11,
    fontFamily: F.numberBold,
    color: '#FF6B6B',
  },
  prDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFC46B',
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
    color: '#F5EFE8',
    lineHeight: 16,
  },
  statSubText: {
    fontFamily: F.body,
    fontSize: 10.5,
    color: '#B7ADA3',
    lineHeight: 14,
  },

  cellBox: {
    width: GRID.kg,
    height: 32,
    backgroundColor: '#2D2925',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 3,
  },
  boxText: {
    fontFamily: F.numberBold,
    fontSize: 13,
    color: '#F5EFE8',
    fontVariant: ['tabular-nums'],
  },
  boxTextDone: {
    color: '#FFFFFF',
  },

  rpeMicroBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#38332F',
    borderRadius: 8,
    paddingHorizontal: 3,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D2925',
  },
  rpeMicroText: {
    fontSize: 8.5,
    fontFamily: F.numberBold,
    color: '#B7ADA3',
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
    backgroundColor: '#2D2925',
  },
  checkCircleCurrent: {
    backgroundColor: '#2D2925',
    borderWidth: 1.5,
    borderColor: '#FF7A59',
  },
  checkCircleDone: {
    backgroundColor: '#FF7A59',
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  footerBtnText: {
    fontFamily: F.bodyMedium,
    fontSize: 13,
    color: '#F5EFE8',
  },
  moreBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
