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
  Button,
  EmptyState,
} from '../ui';
import { Plus, Dumbbell } from 'lucide-react-native';

export const WorkoutsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Treinos"
        onOpenSettings={() => navigation.navigate('Ajustes')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          title="Nenhuma rotina criada"
          description="Crie suas divisões de treino (ex: Treino A, Treino B) ou inicie uma sessão rápida a qualquer momento."
          icon={<Dumbbell size={32} color={colors.primary} strokeWidth={1.75} />}
          primaryAction={{
            title: 'Criar novo treino',
            onPress: () => {},
          }}
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
    flexGrow: 1,
    paddingHorizontal: spacing.margin,
    paddingBottom: spacing.tabBarHeight + spacing.xl,
    justifyContent: 'center',
  },
});
