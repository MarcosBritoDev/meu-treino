import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { X, Check, Trash2, Info } from 'lucide-react-native';
import { colors, radii, spacing, fontFamilies } from '../theme';
import { Text } from './Text';
import { ConfirmModal } from './ConfirmModal';
import { triggerHaptic } from './haptics';
import {
  GROUP_SPLIT_SUGGESTIONS,
  validateGroupName,
} from '../domain/workouts';

export interface EditGroupInitialData {
  id?: string;
  name?: string;
  description?: string | null;
  frequencyDays?: number | null;
}

export interface EditGroupSheetProps {
  visible: boolean;
  mode: 'edit' | 'create';
  initialData?: EditGroupInitialData;
  existingGroupNames?: string[];
  onClose: () => void;
  onSave: (data: { name: string; description?: string; frequencyDays: number }) => void;
  onDelete?: () => void;
}

const FREQUENCY_OPTIONS = [3, 4, 5, 6] as const;

export const EditGroupSheet: React.FC<EditGroupSheetProps> = ({
  visible,
  mode,
  initialData,
  existingGroupNames = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequencyDays, setFrequencyDays] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);

  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Inicializa os campos quando o modal abre ou initialData muda
  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setDescription(initialData?.description ?? '');
      setFrequencyDays(initialData?.frequencyDays ?? 6);
      setError(null);
      setShowDiscardModal(false);
      setShowDeleteModal(false);
    }
  }, [visible, initialData]);

  // Verifica se houve alterações não salvas (dirty state)
  const isDirty = useMemo(() => {
    const initName = initialData?.name ?? '';
    const initDesc = initialData?.description ?? '';
    const initFreq = initialData?.frequencyDays ?? 6;

    if (mode === 'create') {
      return name.trim().length > 0 || description.trim().length > 0 || frequencyDays !== 6;
    }
    return name !== initName || description !== initDesc || frequencyDays !== initFreq;
  }, [name, description, frequencyDays, initialData, mode]);

  // Fechamento com verificação de alterações não salvas
  const handleRequestClose = () => {
    if (isDirty) {
      triggerHaptic('warning');
      setShowDiscardModal(true);
    } else {
      triggerHaptic('light');
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    triggerHaptic('light');
    onClose();
  };

  // PanResponder para fechar por arrasto da alça
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 60) {
        handleRequestClose();
      }
    },
  });

  // Salvar formulário com validações completas
  const handleSave = () => {
    const trimmedName = name.trim();
    const otherNames = initialData?.name
      ? existingGroupNames.filter(
          (n) => n.trim().toLowerCase() !== (initialData.name ?? '').trim().toLowerCase()
        )
      : existingGroupNames;

    const validation = validateGroupName(trimmedName, otherNames);
    if (!validation.isValid) {
      setError(validation.error || 'Nome inválido');
      triggerHaptic('error');
      return;
    }

    setError(null);
    triggerHaptic('success');
    onSave({
      name: trimmedName,
      description: description.trim() || undefined,
      frequencyDays,
    });
  };

  // Seleção de sugestão rápida
  const handleSelectSuggestion = (suggestion: (typeof GROUP_SPLIT_SUGGESTIONS)[number]) => {
    triggerHaptic('selection');
    setName(suggestion.name);
    setFrequencyDays(suggestion.frequencyDays);
    if (!description.trim()) {
      setDescription(suggestion.description);
    }
    setError(null);
  };

  if (!visible) return null;

  const title = mode === 'edit' ? 'Editar grupo' : 'Novo grupo';
  const saveLabel = mode === 'edit' ? 'Salvar alterações' : 'Criar grupo';

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={handleRequestClose}
      >
        <View style={styles.overlay}>
          {/* Backdrop escuro 65% que fecha ao toque */}
          <Pressable
            style={styles.backdrop}
            onPress={handleRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar formulário"
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.sheetContainer}>
              {/* Brilho sutil no topo do sheet */}
              <View style={styles.topGlow} />

              {/* Alça de arrastar (Drag Handle) */}
              <View {...panResponder.panHandlers} style={styles.handleArea}>
                <View style={styles.handle} />
              </View>

              {/* Cabeçalho */}
              <View style={styles.header}>
                <Text variant="headline" style={styles.sheetTitle}>
                  {title}
                </Text>
                <Pressable
                  onPress={handleRequestClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                >
                  <X size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* CAMPO 1: Nome do grupo * */}
                <View style={styles.fieldSection}>
                  <View style={styles.labelRow}>
                    <Text variant="labelSmall" style={styles.fieldLabel}>
                      Nome do grupo <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                  </View>

                  <View style={[styles.inputBox, error ? styles.inputBoxError : null]}>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (error) setError(null);
                      }}
                      maxLength={40}
                      placeholder="Ex: Upper / Lower"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      accessible={true}
                      accessibilityLabel="Nome do grupo de treino"
                    />
                    <View style={styles.inputRightActions}>
                      <Text variant="bodySmall" style={styles.charCounter}>
                        {name.length}/40
                      </Text>
                      {name.length > 0 && (
                        <Pressable
                          onPress={() => {
                            triggerHaptic('light');
                            setName('');
                            if (error) setError(null);
                          }}
                          style={styles.clearButton}
                          accessibilityRole="button"
                          accessibilityLabel="Limpar nome"
                        >
                          <X size={13} color={colors.onSurfaceVariant} strokeWidth={2.2} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {error ? (
                    <Text variant="bodySmall" style={styles.errorText}>
                      {error}
                    </Text>
                  ) : null}

                  {/* Sugestões horizontais (chips roláveis sem corte) */}
                  <View style={styles.suggestionsContainer}>
                    <Text variant="bodySmall" style={styles.suggestionsLabel}>
                      Sugestões:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionsScroll}
                    >
                      {GROUP_SPLIT_SUGGESTIONS.map((sug) => {
                        const isSelected =
                          name.trim().toLowerCase() === sug.name.toLowerCase();
                        return (
                          <Pressable
                            key={sug.name}
                            onPress={() => handleSelectSuggestion(sug)}
                            style={[
                              styles.suggestionChip,
                              isSelected && styles.suggestionChipSelected,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Sugestão ${sug.name}`}
                          >
                            <Text
                              variant="labelSmall"
                              style={[
                                styles.suggestionChipText,
                                isSelected && styles.suggestionChipTextSelected,
                              ]}
                            >
                              {sug.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* CAMPO 2: Descrição e foco */}
                <View style={styles.fieldSection}>
                  <View style={styles.labelRow}>
                    <Text variant="labelSmall" style={styles.fieldLabel}>
                      Descrição e foco
                    </Text>
                    <Text variant="bodySmall" style={styles.optionalBadge}>
                      (opcional)
                    </Text>
                  </View>

                  <View style={styles.textareaBox}>
                    <TextInput
                      style={styles.textareaInput}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                      placeholder="Explique o objetivo ou a rotação deste grupo..."
                      placeholderTextColor={colors.textMuted}
                      textAlignVertical="top"
                      accessible={true}
                      accessibilityLabel="Descrição e foco do grupo"
                    />
                  </View>

                  <View style={styles.helperRow}>
                    <Info size={13} color={colors.textMuted} strokeWidth={1.8} />
                    <Text variant="bodySmall" style={styles.helperText}>
                      Explique o objetivo ou a rotação deste grupo.
                    </Text>
                  </View>
                </View>

                {/* CAMPO 3: Frequência recomendada */}
                <View style={styles.fieldSection}>
                  <Text variant="labelSmall" style={styles.fieldLabel}>
                    Frequência recomendada
                  </Text>
                  <View style={styles.frequencyRow}>
                    {FREQUENCY_OPTIONS.map((days) => {
                      const isSelected = frequencyDays === days;
                      return (
                        <Pressable
                          key={days}
                          onPress={() => {
                            triggerHaptic('selection');
                            setFrequencyDays(days);
                          }}
                          style={[
                            styles.freqButton,
                            isSelected && styles.freqButtonSelected,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${days} dias por semana`}
                        >
                          <Text
                            variant="labelSmall"
                            style={[
                              styles.freqButtonText,
                              isSelected && styles.freqButtonTextSelected,
                            ]}
                          >
                            {days} dias
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* AÇÕES */}
                <View style={styles.actionButtonsContainer}>
                  <Pressable
                    onPress={handleSave}
                    disabled={!name.trim()}
                    style={({ pressed }) => [
                      styles.saveButton,
                      !name.trim() && styles.saveButtonDisabled,
                      pressed && styles.saveButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={saveLabel}
                  >
                    <Check size={18} color={name.trim() ? colors.onPrimary : colors.textMuted} strokeWidth={2.4} />
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.saveButtonText,
                        !name.trim() && styles.saveButtonTextDisabled,
                      ]}
                    >
                      {saveLabel}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRequestClose}
                    style={styles.cancelButton}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                  >
                    <Text variant="bodySmall" style={styles.cancelButtonText}>
                      Cancelar
                    </Text>
                  </Pressable>
                </View>

                {/* BOTÃO DE EXCLUIR (Apenas em modo edição) */}
                {mode === 'edit' && onDelete && (
                  <>
                    <View style={styles.dangerSeparator} />
                    <Pressable
                      onPress={() => {
                        triggerHaptic('warning');
                        setShowDeleteModal(true);
                      }}
                      style={styles.deleteGroupButton}
                      accessibilityRole="button"
                      accessibilityLabel="Excluir este grupo"
                    >
                      <Trash2 size={16} color={colors.error} strokeWidth={2} />
                      <Text variant="labelSmall" style={styles.deleteGroupText}>
                        Excluir este grupo
                      </Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal de confirmação de descarte de alterações */}
      <ConfirmModal
        visible={showDiscardModal}
        title="Descartar alterações?"
        description="As alterações não salvas serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardModal(false)}
      />

      {/* Modal de confirmação de exclusão do grupo */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Excluir grupo"
        description={`Tem certeza que deseja excluir o grupo "${name || initialData?.name}"? Todos os treinos deste grupo também serão excluídos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDanger={true}
        onConfirm={() => {
          setShowDeleteModal(false);
          triggerHaptic('medium');
          onDelete?.();
        }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
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
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainer, // #23201D
    borderTopLeftRadius: radii.sheet, // 28px
    borderTopRightRadius: radii.sheet,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  handleArea: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamilies.outfitBold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  fieldSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.2,
  },
  requiredAsterisk: {
    color: colors.primary,
  },
  optionalBadge: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  inputBox: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputBoxError: {
    borderColor: colors.error,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamilies.outfitSemiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    height: '100%',
  },
  inputRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 6,
  },
  suggestionsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 24, // Garante que o último chip não seja cortado
    paddingBottom: 2,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  suggestionChipTextSelected: {
    fontWeight: '700',
    color: colors.onPrimary,
  },
  textareaBox: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderRadius: 12,
    padding: 12,
    minHeight: 76,
  },
  textareaInput: {
    fontFamily: fontFamilies.dmSansRegular,
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
    minHeight: 52,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingLeft: 2,
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  freqButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqButtonSelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  freqButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  freqButtonTextSelected: {
    fontWeight: '700',
    color: colors.onPrimary,
  },
  actionButtonsContainer: {
    marginTop: 12,
    gap: 8,
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dangerSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  deleteGroupButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  deleteGroupText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
  },
});
