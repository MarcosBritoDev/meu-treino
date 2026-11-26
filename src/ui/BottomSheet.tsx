import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radii, spacing } from '../theme';
import { Text } from './Text';
import { triggerHaptic } from './haptics';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  heightPercent?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  heightPercent,
}) => {
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 60) {
        triggerHaptic('light');
        onClose();
      }
    },
  });

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
          accessibilityLabel="Fechar painel"
        />

        {/* Conteúdo do Sheet com raio 28px no topo */}
        <View
          style={[
            styles.sheetContainer,
            heightPercent ? { height: `${heightPercent}%`, maxHeight: `${heightPercent}%` } : undefined,
          ]}
        >
          {/* Alça de arrastar (Drag Handle) */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Cabeçalho do sheet com título e botão fechar (apenas se title fornecido) */}
          {Boolean(title) && (
            <View style={styles.header}>
              <Text variant="headline" style={styles.titleText}>
                {title}
              </Text>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={styles.closeButton}
              >
                <X size={20} color={colors.onSurfaceVariant} strokeWidth={1.75} />
              </Pressable>
            </View>
          )}

          <View style={[styles.body, heightPercent ? styles.bodyFlex : undefined]}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay, // 65% preto
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.margin,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.outlineVariant,
    maxHeight: '92%',
  },
  handleArea: {
    paddingVertical: spacing.gutter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.outline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleText: {
    flex: 1,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  body: {
    paddingBottom: spacing.sm,
  },
  bodyFlex: {
    flex: 1,
  },
});
