import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  X,
  Plus,
  Settings,
  ChevronRight,
  Dumbbell,
  Weight,
  Cable,
  Cpu,
  User,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import { Text, triggerHaptic, Button, EmptySearchIllustration } from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  getExercisesWithPR,
} from '../db/library';
import {
  FILTER_CHIPS,
  FilterChip,
  ExerciseItemData,
  filterAndGroupExercises,
  formatGroupHeader,
  formatExercisePR,
  getEmptyStateTitle,
  getEmptyStateDescription,
} from '../domain/search';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ListItem =
  | { type: 'header'; id: string; title: string; count: number }
  | { type: 'item'; id: string; exercise: ExerciseItemData };

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { unit } = useSettingsStore();

  const [exercises, setExercises] = useState<ExerciseItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<FilterChip>('Todos');

  // Atualiza a busca com debounce de 150 ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Carrega exercícios do banco SQLite local
  const loadExercises = useCallback(() => {
    try {
      const data = getExercisesWithPR();
      setExercises(data);
    } catch (err) {
      console.warn('Erro ao carregar exercícios:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega sempre que a tela ganha foco (ex: volta de cadastro ou sessão de treino)
  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  // Filtra e agrupa conforme busca e chip selecionado
  const groupedSections = useMemo(() => {
    return filterAndGroupExercises(exercises, selectedGroup, debouncedQuery);
  }, [exercises, selectedGroup, debouncedQuery]);

  // Achata as seções para alimentar o FlashList com máxima performance virtualizada
  const flatListItems = useMemo<ListItem[]>(() => {
    const list: ListItem[] = [];
    for (const section of groupedSections) {
      list.push({
        type: 'header',
        id: `header-${section.group}`,
        title: formatGroupHeader(section.group, section.data.length),
        count: section.data.length,
      });
      for (const ex of section.data) {
        list.push({
          type: 'item',
          id: ex.id,
          exercise: ex,
        });
      }
    }
    return list;
  }, [groupedSections]);

  const handleClearSearch = useCallback(() => {
    triggerHaptic('light');
    setSearchText('');
    setDebouncedQuery('');
  }, []);

  const handleResetFilters = useCallback(() => {
    triggerHaptic('light');
    setSearchText('');
    setDebouncedQuery('');
    setSelectedGroup('Todos');
  }, []);

  const handleOpenSettings = useCallback(() => {
    triggerHaptic('light');
    navigation.navigate('Ajustes');
  }, [navigation]);

  const handleOpenNewExercise = useCallback((initialName?: string) => {
    triggerHaptic('light');
    navigation.navigate('NewExercise', {
      initialName: initialName && initialName.trim() ? initialName.trim() : undefined,
    });
  }, [navigation]);

  const handleExercisePress = useCallback(
    (exerciseId: string) => {
      triggerHaptic('light');
      navigation.navigate('ExerciseDetail', { exerciseId });
    },
    [navigation]
  );

  const renderEquipmentIcon = (equipment: string) => {
    const eq = equipment.toLowerCase();
    if (eq.includes('barra')) {
      return <Weight size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('halter')) {
      return <Dumbbell size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('cabo') || eq.includes('polia')) {
      return <Cable size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    if (eq.includes('máquina') || eq.includes('maquina')) {
      return <Cpu size={20} color={colors.primary} strokeWidth={1.75} />;
    }
    return <User size={20} color={colors.primary} strokeWidth={1.75} />;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeaderContainer}>
          <Text variant="labelSmall" style={styles.sectionHeaderText}>
            {item.title}
          </Text>
        </View>
      );
    }

    const ex = item.exercise;
    const prText = formatExercisePR(ex.bestWeight, ex.bestReps, unit);

    return (
      <Pressable
        onPress={() => handleExercisePress(ex.id)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${ex.name}, ${ex.muscleGroup}, ${ex.equipment}${
          prText ? `, melhor marca ${prText}` : ''
        }`}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.iconBox}>
            {renderEquipmentIcon(ex.equipment)}
          </View>
          <View style={styles.cardDetails}>
            <Text
              variant="bodyLarge"
              numberOfLines={2}
              style={styles.exerciseName}
            >
              {ex.name}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.exerciseSubtitle}>
              {`${ex.muscleGroup} · ${ex.equipment}`}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          {prText ? (
            <View style={styles.prContainer}>
              <Text variant="labelSmall" color="muted" style={styles.prLabel}>
                Melhor
              </Text>
              <Text variant="bodyMedium" tabular style={styles.prValue}>
                {prText}
              </Text>
            </View>
          ) : null}
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerTitleColumn}>
          <Text variant="displayMedium" style={styles.headerTitle}>
            Biblioteca
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.headerSubtitle}>
            Catálogo de movimentos
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleOpenSettings}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            style={({ pressed }) => [
              styles.gearButton,
              pressed && styles.gearButtonPressed,
            ]}
          >
            <Settings size={22} color={colors.onSurfaceVariant} strokeWidth={1.75} />
          </Pressable>

          <Pressable
            onPress={() => handleOpenNewExercise()}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar novo exercício"
            style={({ pressed }) => [
              styles.newButton,
              pressed && styles.newButtonPressed,
            ]}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.2} />
            <Text variant="bodyMedium" style={styles.newButtonText}>
              Novo
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. CAMPO DE BUSCA */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconWrapper}>
            <Search size={18} color={colors.textMuted} strokeWidth={1.75} />
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar exercício"
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={1.3}
            accessible={true}
            accessibilityLabel="Campo de busca de exercícios"
          />

          {searchText.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              style={styles.clearButton}
            >
              <X size={16} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. CHIPS HORIZONTAIS */}
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContent}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = selectedGroup === chip;
            return (
              <Pressable
                key={chip}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedGroup(chip);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Filtrar por ${chip}`}
                style={[
                  styles.chip,
                  isSelected ? styles.chipSelected : styles.chipUnselected,
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                  ]}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. CONTEÚDO PRINCIPAL (LISTA, ESQUELETO OU BUSCA VAZIA) */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTexts}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonSubtitle} />
                </View>
                <View style={styles.skeletonRight} />
              </View>
            ))}
          </View>
        ) : flatListItems.length === 0 ? (
          /* TELA 2.2 — BIBLIOTECA BUSCA VAZIA */
          (() => {
            const isLibraryEmpty = exercises.length === 0;
            const currentTerm = (debouncedQuery || searchText).trim();
            const emptyTitle = getEmptyStateTitle(isLibraryEmpty);
            const emptyDescription = getEmptyStateDescription(
              isLibraryEmpty,
              currentTerm,
              selectedGroup
            );

            return (
              <View style={styles.emptyContainer}>
                <EmptySearchIllustration size={144} style={styles.emptyIllustration} />
                <Text variant="headline" style={styles.emptyTitle}>
                  {emptyTitle}
                </Text>
                <Text
                  variant="bodyMedium"
                  color="secondary"
                  numberOfLines={2}
                  style={styles.emptySubtitle}
                >
                  {emptyDescription}
                </Text>
                <View style={styles.emptyActions}>
                  <Button
                    title="+ Cadastrar exercício"
                    variant="primary"
                    onPress={() => handleOpenNewExercise(currentTerm)}
                    style={styles.emptyPrimaryButton}
                  />
                  {!isLibraryEmpty && (
                    <Button
                      title="Limpar busca"
                      variant="text"
                      onPress={handleResetFilters}
                      style={styles.emptySecondaryButton}
                    />
                  )}
                </View>
              </View>
            );
          })()
        ) : (
          <FlashList
            data={flatListItems}
            renderItem={renderItem}
            getItemType={(item) => item.type}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flashListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background, // #1A1715
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitleColumn: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gearButton: {
    width: spacing.touchTargetMin, // 48px
    height: spacing.touchTargetMin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearButtonPressed: {
    opacity: 0.6,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer, // #3A251F
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 89, 0.4)',
  },
  newButtonPressed: {
    backgroundColor: 'rgba(255, 122, 89, 0.25)',
  },
  newButtonText: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    fontSize: 13,
    color: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.surfaceContainerHighest, // #38332F
    borderRadius: radii.input, // 16px
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    paddingHorizontal: spacing.sm,
  },
  searchIconWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipsSection: {
    paddingVertical: spacing.xs,
  },
  chipsScrollContent: {
    paddingHorizontal: spacing.margin,
    gap: spacing.xs,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.primary, // #FF7A59
  },
  chipUnselected: {
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipTextSelected: {
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.onPrimary, // #1A1715
  },
  chipTextUnselected: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: '500',
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  listContainer: {
    flex: 1,
  },
  flashListContent: {
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.tabBarHeight + spacing.xl,
  },
  sectionHeaderContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.labelSmall.fontFamily,
    fontWeight: '600',
    color: colors.onSurfaceVariant, // #B7ADA3
  },
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer, // #23201D
    borderWidth: 1,
    borderColor: colors.outlineVariant, // #3A3531
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.xs + 2,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: colors.surfaceContainerHigh,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh, // #2D2925
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.bodyLarge.fontFamily,
    fontWeight: '500',
    color: colors.onSurface,
  },
  exerciseSubtitle: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    paddingLeft: 4,
  },
  prContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  prLabel: {
    fontSize: 11,
    lineHeight: 12,
    marginBottom: 2,
  },
  prValue: {
    fontSize: 14,
    lineHeight: 16,
    fontFamily: typography.headline.fontFamily,
    fontWeight: '600',
    color: colors.onSurface,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIllustration: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.xl,
  },
  emptyActions: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyPrimaryButton: {
    width: '100%',
  },
  emptySecondaryButton: {
    width: '100%',
  },
  skeletonContainer: {
    paddingHorizontal: spacing.margin,
    gap: spacing.xs + 2,
    paddingTop: spacing.sm,
  },
  skeletonCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonTexts: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  skeletonTitle: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonSubtitle: {
    width: '35%',
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
  skeletonRight: {
    width: 44,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
  },
});
