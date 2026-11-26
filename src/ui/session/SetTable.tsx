import React, { memo, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  MoreVertical,
  Trophy,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react-native';
import { F } from './tokens';
import {
  Unit,
  SetType,
  RepsMode,
  EffortMode,
  formatWeight,
  rowStates,
  RowState,
  formatRepsTarget,
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
  // 1. MODO PRÉVIA (3 COLUNAS LIMPAS: Série | Meta | ⋮ — SEM PESO, SEM DUPLICATA)
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
        {/* Cabeçalho de 3 colunas limpas: Série | Meta | (ação ⋮) */}
        <View
          style={s.previewHeader}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[s.headText, s.previewColSerie]}>Série</Text>
          <Text style={[s.headText, s.previewColMeta]}>Meta</Text>
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
            const rawEffort =
              setType === 'normal' || setType === 'drop' || (!setType && !set.isWarmup && !set.isFailure)
                ? formatTarget(set, p.unit, refName)
                : '';
            const effort = rawEffort.replace(/\s*da anterior$/i, '');

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

                  {/* 2. META (Reps em destaque Outfit tabular + Esforço em subtexto) */}
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

                  {/* 3. AÇÃO (⋮) */}
                  <View style={s.previewColAction}>
                    <Pressable
                      style={({ pressed }) => [
                        s.previewMenuBtn,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setActiveMenuSetId(set.id);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Opções da série ${badgeLabel}`}
                    >
                      <MoreVertical size={18} color="#8E8E93" />
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

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
  // 2. MODO ATIVO (5 COLUNAS FOLGADAS: Série | Meta e anterior | kg/lb | Reps | ✓)
  // ==========================================================================
  const states = rowStates(
    p.sets.map((s) => ({ completedAt: s.completedAt ?? null }))
  );
  const previousList = p.previous ?? [];

  return (
    <View style={s.tableContainer}>
      {/* CABEÇALHO DE 5 COLUNAS FOLGADAS */}
      <View
        style={s.activeHeader}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text style={[s.headText, s.activeColSerie]}>Série</Text>
        <Text style={[s.headText, s.activeColMeta]} numberOfLines={1}>
          Meta e anterior
        </Text>
        <Text style={[s.headText, s.activeColWeight]}>{p.unit}</Text>
        <Text style={[s.headText, s.activeColReps]}>Reps</Text>
        <View style={s.activeColCheck}>
          <Check size={14} color="#B7ADA3" strokeWidth={2.4} />
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
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isRepsFocused, setIsRepsFocused] = useState(false);
  const repsInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const done = state === 'done';
  const current = state === 'current';

  const setType = (set.type ||
    (set.isWarmup ? 'warmup' : set.isFailure ? 'failure' : 'normal')) as string;

  // 1. Anterior: apenas carga × reps
  const prevWeight = previous
    ? (previous as any).weightKg ?? (previous as any).weight
    : null;
  const prevText =
    previous && prevWeight !== null && prevWeight !== undefined
      ? `${formatWeight(prevWeight, unit)} ${unit} × ${previous.reps}`
      : '—';

  // 2. Meta: formatRepsTarget e esforço
  const repsTarget = formatRepsTarget(set);
  const refExerciseId = set.effortRefExerciseId ?? set.effort_ref_exercise_id;
  const refName = refExerciseId ? refExerciseName?.(refExerciseId) : undefined;
  const rawEffort =
    setType === 'normal' || setType === 'drop' || (!setType && !set.isWarmup && !set.isFailure)
      ? (setType === 'drop' ? formatTarget(set, unit, refName) : formatEffort(set, unit, refName))
      : '';
  const effort = rawEffort.replace(/\s*da anterior$/i, '');

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
              (setType === 'normal' || (!setType && !set.isWarmup)) && s.badgeNormal,
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

      {/* 2. META E ANTERIOR */}
      <View style={s.activeColMeta}>
        <Text style={s.activeStatPrimary} numberOfLines={1} ellipsizeMode="tail">
          {repsTarget}
          {Boolean(effort) && (
            <Text style={s.metaEffortInline}>{` • ${effort}`}</Text>
          )}
        </Text>
        <Text
          style={[s.activeStatPrev, prevText === '—' && s.statEmptyText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {prevText === '—' ? 'Ant: —' : `Ant: ${prevText}`}
        </Text>
      </View>

      {/* 3. CARGA (kg ou lb) */}
      <View style={s.activeColWeight}>
        <TextInput
          value={displayWeight === '—' ? '' : displayWeight}
          onChangeText={(val) => onActiveChange?.(set.id, 'weight', val)}
          onFocus={() => {
            setIsWeightFocused(true);
            onEditWeight?.(set.id);
          }}
          onBlur={() => setIsWeightFocused(false)}
          placeholder="0"
          placeholderTextColor="#7D746B"
          keyboardType="decimal-pad"
          returnKeyType="next"
          onSubmitEditing={() => repsInputRef.current?.focus()}
          selectTextOnFocus
          style={[
            s.activeBoxInput,
            isWeightFocused && s.activeBoxInputFocused,
            done && s.activeBoxInputDone,
            isManualDrop && s.activeBoxInputManualDrop,
          ]}
          accessibilityLabel={`Carga ${displayWeight} ${unit}`}
        />
      </View>

      {/* 4. REPS */}
      <View style={s.activeColReps}>
        <TextInput
          ref={repsInputRef}
          value={displayReps}
          onChangeText={(val) => onActiveChange?.(set.id, 'reps', val)}
          onFocus={() => {
            setIsRepsFocused(true);
            onEditReps?.(set.id);
          }}
          onBlur={() => setIsRepsFocused(false)}
          placeholder="0"
          placeholderTextColor="#7D746B"
          keyboardType="numeric"
          returnKeyType="done"
          selectTextOnFocus
          style={[
            s.activeBoxInput,
            isRepsFocused && s.activeBoxInputFocused,
            done && s.activeBoxInputDone,
          ]}
          accessibilityLabel={`${displayReps} repetições`}
        />
      </View>

      {/* 5. CHECKMARK (Touch target >= 48dp) */}
      <View style={s.activeColCheck}>
        <Pressable
          style={({ pressed }) => [
            s.checkPressable,
            pressed && { opacity: 0.75 },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          onPress={() => {
            triggerHaptic('medium');
            onToggle?.(set.id);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Desmarcar série ${label}` : `Concluir série ${label}`}
        >
          <View style={[s.checkCircle, done ? s.checkCircleDone : s.checkCirclePending]}>
            <Check
              size={17}
              color={done ? '#1A1715' : '#7D746B'}
              strokeWidth={done ? 3 : 2.2}
            />
          </View>
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
  // Prévia (3 Colunas: Série | Meta | Ação)
  // --------------------------------------------------------------------------
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  previewColSerie: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewColMeta: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  previewColAction: {
    width: 40,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    minHeight: 48,
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
    backgroundColor: 'rgba(255, 122, 89, 0.15)',
  },
  badgeTextWarmup: {
    color: '#FF7A59',
  },
  badgeFailure: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  badgeTextFailure: {
    color: '#FF6B6B',
  },
  badgeDrop: {
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
  },
  badgeTextDrop: {
    color: '#C084FC',
  },
  badgeNormal: {
    backgroundColor: '#2D2925',
  },
  badgeTextNormal: {
    color: '#F5EFE8',
  },
  previewMetaPrimary: {
    fontFamily: F.numberBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F5EFE8',
    lineHeight: 18,
  },
  previewMetaSub: {
    fontFamily: F.body,
    fontSize: 11.5,
    color: '#B7ADA3',
    lineHeight: 15,
    marginTop: 1,
  },
  previewMenuBtn: {
    width: 36,
    height: 36,
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
    minHeight: 48,
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
  // Ativo (5 Colunas Folgadas: Série | Meta e anterior | kg/lb | Reps | ✓)
  // --------------------------------------------------------------------------
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  activeRowsContainer: {
    gap: 4,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 10,
    minHeight: 50,
  },
  activeRowDone: {
    backgroundColor: 'rgba(255, 122, 89, 0.05)',
  },
  activeRowCurrent: {
    backgroundColor: '#3A251F',
    borderLeftWidth: 3,
    borderLeftColor: '#FF7A59',
    borderRadius: 10,
  },
  activeColSerie: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColMeta: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  activeColWeight: {
    width: 60,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColReps: {
    width: 52,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeColCheck: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStatPrimary: {
    fontFamily: F.numberBold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F5EFE8',
    lineHeight: 16,
  },
  metaEffortInline: {
    fontFamily: F.body,
    fontSize: 11,
    color: '#B7ADA3',
    lineHeight: 15,
  },
  activeStatPrev: {
    fontFamily: F.body,
    fontSize: 11,
    color: '#B7ADA3',
    lineHeight: 14,
    marginTop: 2,
  },
  statEmptyText: {
    color: '#7D746B',
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
    height: 42,
    backgroundColor: '#2D2925',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: F.numberBold,
    fontWeight: '700',
    color: '#F5EFE8',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  activeBoxInputFocused: {
    borderColor: '#FF7A59',
    backgroundColor: '#38332F',
  },
  activeBoxInputDone: {
    opacity: 0.85,
  },
  activeBoxInputManualDrop: {
    borderColor: '#C084FC',
    borderWidth: 1.5,
    backgroundColor: 'rgba(192, 132, 252, 0.08)',
  },
  checkPressable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCirclePending: {
    backgroundColor: '#2D2925',
  },
  checkCircleDone: {
    backgroundColor: '#FF7A59',
  },
  headText: {
    fontFamily: F.bodyMedium,
    fontSize: 11,
    color: '#B7ADA3',
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
});
