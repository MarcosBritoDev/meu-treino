import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Edit3,
  SkipForward,
  RefreshCw,
  Trash2,
  X,
  Info,
} from 'lucide-react-native';
import { colors, radii } from '../theme';
import { Text } from './Text';
import { BottomSheet } from './BottomSheet';

export interface ActiveExerciseActionSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseName?: string;
  onEditThisSession: () => void;
  onSkipExercise: () => void;
  onReplaceExercise: () => void;
  onRemoveExercise: () => void;
}

export const ActiveExerciseActionSheet: React.FC<ActiveExerciseActionSheetProps> = ({
  visible,
  onClose,
  exerciseName,
  onEditThisSession,
  onSkipExercise,
  onReplaceExercise,
  onRemoveExercise,
}) => {
  return (
    <BottomSheet visible={visible} onClose={onClose} heightPercent={48}>
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headline" style={styles.title} numberOfLines={1}>
              {exerciseName || 'Opções do exercício'}
            </Text>
            <View style={styles.infoBadge}>
              <Info size={13} color={colors.primary} strokeWidth={2.2} />
              <Text variant="labelSmall" style={styles.infoBadgeText}>
                Apenas esta sessão em andamento
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar menu"
          >
            <X size={20} color={colors.onSurfaceVariant} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* OPÇÕES DE AÇÃO */}
        <View style={styles.actionsList}>
          {/* 1. Editar só esta sessão */}
          <Pressable
            onPress={() => {
              onClose();
              onEditThisSession();
            }}
            style={styles.actionItem}
          >
            <View style={styles.actionIconCircle}>
              <Edit3 size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text variant="bodyLarge" style={styles.actionTitle}>
                Editar só esta sessão
              </Text>
              <Text variant="bodySmall" color="secondary">
                Ajustar séries, metas de repetições ou descanso
              </Text>
            </View>
          </Pressable>

          {/* 2. Pular exercício */}
          <Pressable
            onPress={() => {
              onClose();
              onSkipExercise();
            }}
            style={styles.actionItem}
          >
            <View style={styles.actionIconCircle}>
              <SkipForward size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text variant="bodyLarge" style={styles.actionTitle}>
                Pular exercício
              </Text>
              <Text variant="bodySmall" color="secondary">
                Passar para o próximo exercício sem computar séries
              </Text>
            </View>
          </Pressable>

          {/* 3. Substituir exercício */}
          <Pressable
            onPress={() => {
              onClose();
              onReplaceExercise();
            }}
            style={styles.actionItem}
          >
            <View style={styles.actionIconCircle}>
              <RefreshCw size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text variant="bodyLarge" style={styles.actionTitle}>
                Substituir exercício
              </Text>
              <Text variant="bodySmall" color="secondary">
                Escolher outro exercício na biblioteca para o lugar deste
              </Text>
            </View>
          </Pressable>

          {/* 4. Remover da sessão */}
          <Pressable
            onPress={() => {
              onClose();
              onRemoveExercise();
            }}
            style={styles.actionItem}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(255, 180, 171, 0.12)' }]}>
              <Trash2 size={18} color={colors.error} strokeWidth={2} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text variant="bodyLarge" style={[styles.actionTitle, { color: colors.error }]}>
                Remover da sessão
              </Text>
              <Text variant="bodySmall" color="secondary">
                Tirar este bloco apenas deste treino de hoje
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  actionsList: {
    paddingVertical: 14,
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
