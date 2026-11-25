import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Animated, PanResponder } from 'react-native';
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

// Altura fixa do card + espaço entre cards = distância real entre slots
const ITEM_HEIGHT = 74;
const GAP = 10;
const PITCH = ITEM_HEIGHT + GAP;

interface ExerciseRowProps {
  item: WorkoutExerciseForEdit;
  index: number;
  dragIndex: number | null;
  overIndex: number | null;
  onStartDrag: (index: number) => void;
  onMoveDrag: (dy: number) => void;
  onEndDrag: (commit: boolean) => void;
  onPress: () => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  item,
  index,
  dragIndex,
  overIndex,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onPress,
}) => {
  const isDraggingThis = dragIndex === index;
  const isAnyDragging = dragIndex !== null;

  const dragY = useRef(new Animated.Value(0)).current; // só usado pelo card arrastado
  const shiftY = useRef(new Animated.Value(0)).current; // deslocamento dos vizinhos
  const scale = useRef(new Animated.Value(1)).current;

  const propsRef = useRef({ index, dragIndex, overIndex, onStartDrag, onMoveDrag, onEndDrag });
  propsRef.current = { index, dragIndex, overIndex, onStartDrag, onMoveDrag, onEndDrag };

  // Vizinhos deslizam para abrir espaço
  useEffect(() => {
    if (dragIndex === null || overIndex === null) {
      shiftY.setValue(0);
      return;
    }
    if (index === dragIndex) return;

    let target = 0;
    if (dragIndex < overIndex && index > dragIndex && index <= overIndex) target = -PITCH;
    else if (dragIndex > overIndex && index >= overIndex && index < dragIndex) target = PITCH;

    Animated.spring(shiftY, {
      toValue: target,
      useNativeDriver: true,
      tension: 220,
      friction: 22,
    }).start();
  }, [dragIndex, overIndex, index, shiftY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        dragY.setValue(0);
        propsRef.current.onStartDrag(propsRef.current.index);
        Animated.spring(scale, { toValue: 1.03, useNativeDriver: true }).start();
      },

      onPanResponderMove: (_, g) => {
        const { index: i, onMoveDrag: move } = propsRef.current;
        // Limita o arrasto para não sair da lista (ajustado no pai)
        dragY.setValue(g.dy);
        move(g.dy);
        void i;
      },

      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(false),
    })
  ).current;

  const finish = (commit: boolean) => {
    const { index: i, overIndex: over, onEndDrag: end } = propsRef.current;
    const finalSlot = commit && over !== null ? over : i;

    Animated.parallel([
      Animated.spring(dragY, {
        toValue: (finalSlot - i) * PITCH,
        useNativeDriver: true,
        tension: 220,
        friction: 22,
      }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      end(commit);
      dragY.setValue(0);
    });
  };

  const formattedIndex = String(index + 1).padStart(2, '0');

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        isDraggingThis && styles.cardContainerDragging,
        {
          transform: isDraggingThis
            ? [{ translateY: dragY }, { scale }]
            : [{ translateY: shiftY }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isAnyDragging}
        style={({ pressed }) => [
          styles.exerciseCard,
          isDraggingThis && styles.exerciseCardDragging,
          pressed && !isDraggingThis && styles.exerciseCardPressed,
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
          <View style={[styles.dragHandleBox, isDraggingThis && styles.dragHandleBoxActive]}>
            <GripVertical
              size={20}
              color={isDraggingThis ? colors.primary : colors.onSurfaceVariant}
              strokeWidth={2}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const ReorderableExerciseList: React.FC<ReorderableExerciseListProps> = ({
  exercises,
  onReorder,
  onPressItem,
  onDragStart,
  onDragEnd,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const overRef = useRef<number | null>(null);
  const dragRef = useRef<number | null>(null);

  const handleStartDrag = useCallback(
    (index: number) => {
      dragRef.current = index;
      overRef.current = index;
      setDragIndex(index);
      setOverIndex(index);
      triggerHaptic('medium');
      onDragStart?.();
    },
    [onDragStart]
  );

  const handleMoveDrag = useCallback(
    (dy: number) => {
      const from = dragRef.current;
      if (from === null) return;
      const raw = Math.round(from + dy / PITCH);
      const next = Math.max(0, Math.min(exercises.length - 1, raw));
      if (next !== overRef.current) {
        overRef.current = next;
        setOverIndex(next);
        triggerHaptic('selection');
      }
    },
    [exercises.length]
  );

  const handleEndDrag = useCallback(
    (commit: boolean) => {
      const from = dragRef.current;
      const to = overRef.current;

      if (commit && from !== null && to !== null && from !== to) {
        const updated = [...exercises];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        onReorder(updated.map((e, idx) => ({ ...e, position: idx })));
      }

      dragRef.current = null;
      overRef.current = null;
      setDragIndex(null);
      setOverIndex(null);
      triggerHaptic('success');
      onDragEnd?.();
    },
    [exercises, onReorder, onDragEnd]
  );

  return (
    <View style={styles.container}>
      {exercises.map((item, index) => {
        const itemId = item.id || item.exerciseId || `item-${index}`;
        return (
          <ExerciseRow
            key={itemId}
            item={item}
            index={index}
            dragIndex={dragIndex}
            overIndex={overIndex}
            onStartDrag={handleStartDrag}
            onMoveDrag={handleMoveDrag}
            onEndDrag={handleEndDrag}
            onPress={() => onPressItem(index)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  cardContainer: {
    height: ITEM_HEIGHT,
    marginBottom: GAP,
    zIndex: 1,
  },
  cardContainerDragging: {
    zIndex: 9999,
    elevation: 12,
  },
  exerciseCard: {
    height: ITEM_HEIGHT,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.card || 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exerciseCardPressed: {
    backgroundColor: '#35302C',
  },
  exerciseCardDragging: {
    backgroundColor: '#3A251F',
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
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
