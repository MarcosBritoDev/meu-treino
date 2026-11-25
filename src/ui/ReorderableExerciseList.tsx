import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Easing,
} from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { colors, fontFamilies, radii } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';
import { WorkoutExerciseForEdit } from '../db/workouts';

export interface ReorderableExerciseListProps {
  exercises: WorkoutExerciseForEdit[];
  onReorder: (reordered: WorkoutExerciseForEdit[]) => void;
  onPressItem: (index: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * Arquitetura anti-flicker:
 * - Cada card é posicionado de forma absoluta e tem seu próprio Animated.Value (translateY).
 * - A posição de um card NÃO depende do índice no array React: reordenar o array
 *   no fim do gesto não move nada na tela (os valores já estão nos slots finais).
 * - Durante o arrasto não há setState por movimento: o card arrastado segue o dedo
 *   via setValue (native driver) e só o vizinho que troca de slot anima.
 */
const ITEM_HEIGHT = 74;
const GAP = 10;
const PITCH = ITEM_HEIGHT + GAP;
const SWAP_DURATION = 160;
const SETTLE_DURATION = 160;

const getId = (item: WorkoutExerciseForEdit, index: number): string =>
  String(item.id || item.exerciseId || `item-${index}`);

interface DragController {
  start: (id: string) => void;
  move: (id: string, dy: number) => void;
  end: (id: string) => void;
  press: (id: string) => void;
}

interface ExerciseRowProps {
  item: WorkoutExerciseForEdit;
  displayIndex: number;
  y: Animated.Value;
  isDragging: boolean;
  anyDragging: boolean;
  id: string;
  controller: DragController;
}

const ExerciseRowComponent: React.FC<ExerciseRowProps> = ({
  item,
  displayIndex,
  y,
  isDragging,
  anyDragging,
  id,
  controller,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const latest = useRef({ id, controller });
  latest.current = { id, controller };

  const animateScale = (to: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        animateScale(1.03);
        latest.current.controller.start(latest.current.id);
      },
      onPanResponderMove: (_, g) => {
        latest.current.controller.move(latest.current.id, g.dy);
      },
      onPanResponderRelease: () => {
        animateScale(1);
        latest.current.controller.end(latest.current.id);
      },
      onPanResponderTerminate: () => {
        animateScale(1);
        latest.current.controller.end(latest.current.id);
      },
    })
  ).current;

  const formattedIndex = String(displayIndex + 1).padStart(2, '0');

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        isDragging && styles.cardContainerDragging,
        { transform: [{ translateY: y }, { scale }] },
      ]}
    >
      <Pressable
        onPress={() => controller.press(id)}
        disabled={anyDragging}
        style={({ pressed }) => [
          styles.exerciseCard,
          isDragging && styles.exerciseCardDragging,
          pressed && !isDragging && styles.exerciseCardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.targetSets} séries de ${item.repMin} a ${item.repMax} repetições. Toque para editar metas.`}
      >
        <View style={styles.exerciseCardLeft}>
          <Text variant="displayMedium" style={styles.ordinalNumber}>
            {formattedIndex}
          </Text>
          <View style={styles.exerciseInfo}>
            <Text variant="bodyMedium" style={styles.exerciseNameText} numberOfLines={1}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={styles.exerciseMetaText}>
              {item.targetSets} séries · {item.repMin}-{item.repMax} reps · {item.restS}s
            </Text>
          </View>
        </View>

        <View
          {...panResponder.panHandlers}
          style={styles.dragHandleTouchArea}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={`Arrastar para reordenar ${item.name}`}
        >
          <View style={[styles.dragHandleBox, isDragging && styles.dragHandleBoxActive]}>
            <GripVertical
              size={20}
              color={isDragging ? colors.primary : colors.onSurfaceVariant}
              strokeWidth={2}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const ExerciseRow = memo(ExerciseRowComponent);

export const ReorderableExerciseList: React.FC<ReorderableExerciseListProps> = ({
  exercises,
  onReorder,
  onPressItem,
  onDragStart,
  onDragEnd,
}) => {
  // Posição Y animada de cada card, indexada por id (independe da ordem do array)
  const yMap = useRef<Map<string, Animated.Value>>(new Map());
  // Ordem "viva" (ids) durante/depois do arrasto
  const orderRef = useRef<string[]>(exercises.map(getId));
  const [liveOrder, setLiveOrder] = useState<string[]>(orderRef.current);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const draggingRef = useRef<string | null>(null);
  const startYRef = useRef(0);

  const latest = useRef({ exercises, onReorder, onPressItem, onDragStart, onDragEnd });
  latest.current = { exercises, onReorder, onPressItem, onDragStart, onDragEnd };

  const getY = (id: string, initial: number): Animated.Value => {
    let v = yMap.current.get(id);
    if (!v) {
      v = new Animated.Value(initial);
      yMap.current.set(id, v);
    }
    return v;
  };

  // Sincroniza com as props quando NÃO está arrastando (adição/remoção/reordenação externa)
  useEffect(() => {
    if (draggingRef.current) return;

    const ids = exercises.map(getId);
    orderRef.current = ids;
    ids.forEach((id, i) => getY(id, i * PITCH).setValue(i * PITCH));

    // Limpa valores de itens removidos
    const alive = new Set(ids);
    Array.from(yMap.current.keys()).forEach((k) => {
      if (!alive.has(k)) yMap.current.delete(k);
    });

    setLiveOrder((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids
    );
  }, [exercises]);

  const controller = useMemo<DragController>(
    () => ({
      start: (id) => {
        const slot = orderRef.current.indexOf(id);
        if (slot < 0) return;
        draggingRef.current = id;
        startYRef.current = slot * PITCH;
        setDraggingId(id);
        triggerHaptic('medium');
        latest.current.onDragStart?.();
      },

      move: (id, dy) => {
        if (draggingRef.current !== id) return;
        const order = orderRef.current;
        const count = order.length;
        const maxY = (count - 1) * PITCH;

        const y = Math.max(0, Math.min(maxY, startYRef.current + dy));
        const dragged = yMap.current.get(id);
        dragged?.setValue(y);

        const currentSlot = order.indexOf(id);
        const targetSlot = Math.max(0, Math.min(count - 1, Math.round(y / PITCH)));
        if (targetSlot === currentSlot) return;

        // Nova ordem: move o arrastado para o slot alvo
        const next = [...order];
        next.splice(currentSlot, 1);
        next.splice(targetSlot, 0, id);

        // Anima apenas os cards cujo slot mudou (exceto o arrastado)
        next.forEach((otherId, slot) => {
          if (otherId === id) return;
          if (order[slot] === otherId) return; // slot não mudou
          const v = yMap.current.get(otherId);
          if (!v) return;
          Animated.timing(v, {
            toValue: slot * PITCH,
            duration: SWAP_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        });

        orderRef.current = next;
        setLiveOrder(next);
        triggerHaptic('selection');
      },

      end: (id) => {
        if (draggingRef.current !== id) return;
        const finalOrder = orderRef.current;
        const finalSlot = finalOrder.indexOf(id);
        const dragged = yMap.current.get(id);
        if (!dragged) {
          draggingRef.current = null;
          setDraggingId(null);
          return;
        }

        Animated.timing(dragged, {
          toValue: finalSlot * PITCH,
          duration: SETTLE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          const { exercises: list, onReorder: reorder, onDragEnd: dragEnd } = latest.current;

          const byId = new Map(list.map((e, i) => [getId(e, i), e]));
          const reordered = finalOrder
            .map((fid) => byId.get(fid))
            .filter((e): e is WorkoutExerciseForEdit => !!e)
            .map((e, idx) => ({ ...e, position: idx }));

          const changed = finalOrder.some((fid, i) => getId(list[i], i) !== fid);

          draggingRef.current = null;
          setDraggingId(null);
          triggerHaptic('success');
          if (changed) reorder(reordered);
          dragEnd?.();
        });
      },

      press: (id) => {
        const idx = latest.current.exercises.findIndex((e, i) => getId(e, i) === id);
        if (idx >= 0) latest.current.onPressItem(idx);
      },
    }),
    []
  );

  const positions = useMemo(() => {
    const m = new Map<string, number>();
    liveOrder.forEach((id, i) => m.set(id, i));
    return m;
  }, [liveOrder]);

  const totalHeight = Math.max(0, exercises.length * PITCH - GAP);

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {exercises.map((item, index) => {
        const id = getId(item, index);
        const displayIndex = positions.get(id) ?? index;
        return (
          <ExerciseRow
            key={id}
            id={id}
            item={item}
            displayIndex={displayIndex}
            y={getY(id, displayIndex * PITCH)}
            isDragging={draggingId === id}
            anyDragging={draggingId !== null}
            controller={controller}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    zIndex: 1,
  },
  cardContainerDragging: {
    zIndex: 9999,
    elevation: 8,
  },
  exerciseCard: {
    height: ITEM_HEIGHT,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card || 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent', // borda de largura fixa evita reflow
  },
  exerciseCardPressed: {
    backgroundColor: '#35302C',
  },
  exerciseCardDragging: {
    backgroundColor: '#3A251F',
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exerciseCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  ordinalNumber: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 18,
    color: colors.primary,
    width: 26,
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseNameText: {
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 2,
  },
  exerciseMetaText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  dragHandleTouchArea: {
    padding: 10,
    marginRight: -6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleBox: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  dragHandleBoxActive: {
    backgroundColor: 'rgba(255, 122, 89, 0.22)',
  },
});
