import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Text } from './Text';
import { Button } from './Button';
import { triggerHaptic } from './haptics';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  discardLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDiscard?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  discardLabel,
  isDanger = false,
  onConfirm,
  onCancel,
  onDiscard,
}) => {
  if (!visible) return null;

  const hasDiscard = Boolean(discardLabel && onDiscard);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            triggerHaptic('light');
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancelar e fechar"
        />

        <View
          style={styles.modalCard}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`${title}. ${description}`}
        >
          <Text variant="headline" style={styles.title}>
            {title}
          </Text>

          <Text variant="bodyMedium" color="secondary" style={styles.description}>
            {description}
          </Text>

          {hasDiscard ? (
            <View style={styles.actionsStacked}>
              <Button
                title={confirmLabel}
                variant={isDanger ? 'danger' : 'primary'}
                onPress={onConfirm}
                style={styles.buttonStacked}
              />
              <Button
                title={cancelLabel}
                variant="secondary"
                onPress={onCancel}
                style={styles.buttonStacked}
              />
              <Button
                title={discardLabel!}
                variant="text"
                onPress={onDiscard!}
                textStyle={styles.discardButtonText}
                style={styles.buttonStacked}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                title={cancelLabel}
                variant="secondary"
                onPress={onCancel}
                style={styles.button}
              />
              <Button
                title={confirmLabel}
                variant={isDanger ? 'danger' : 'primary'}
                onPress={onConfirm}
                style={styles.button}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay, // 65% preto
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.margin,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainer, // #23201D
    borderRadius: radii.card, // 24px
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  title: {
    marginBottom: spacing.sm,
  },
  description: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionsStacked: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  buttonStacked: {
    width: '100%',
  },
  discardButtonText: {
    color: colors.error,
    fontWeight: '600',
  },
});
