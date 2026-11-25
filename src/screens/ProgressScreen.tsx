import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  PRBadge,
  EmptyState,
} from '../ui';
import { TrendingUp, Trophy } from 'lucide-react-native';

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Progresso"
        onOpenSettings={() => navigation.navigate('Ajustes')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="surface" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text variant="headline">Recordes pessoais</Text>
            <PRBadge label="PRs ativos" />
          </View>
          <Text variant="bodyMedium" color="secondary">
            Conforme você conclui treinos, novos recordes de carga máxima e volume unitário são destacados em âmbar.
          </Text>
        </Card>

        <EmptyState
          title="Sem histórico registrado"
          description="Complete seu primeiro treino para acompanhar métricas de volume, consistência e evolução de cargas."
          icon={<TrendingUp size={32} color={colors.primary} strokeWidth={1.75} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.tabBarHeight + spacing.xl,
    gap: spacing.gutter,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
