import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, typography } from '../theme';
import {
  ScreenHeader,
  Card,
  Text,
  SegmentedControl,
  Stepper,
  Button,
  BottomSheet,
  TextField,
  triggerHaptic,
} from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  Zap,
  FolderArchive,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  User,
} from 'lucide-react-native';

const APP_VERSION = '1.0.0';
const APP_BUILD = '1';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    userName,
    setUserName,
    unit,
    setUnit,
    defaultIncrement,
    setDefaultIncrement,
    autoRestTimer,
    setAutoRestTimer,
    restAlert,
    setRestAlert,
    resetOnboarding,
  } = useSettingsStore();

  const [nameInput, setNameInput] = useState(userName || '');
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [licensesSheetOpen, setLicensesSheetOpen] = useState(false);

  const isAlertEnabled = restAlert !== 'none';

  const handleToggleAlert = (val: boolean) => {
    if (!autoRestTimer) return;
    triggerHaptic('light');
    setRestAlert(val ? 'both' : 'none');
  };

  const handleToggleAutoTimer = (val: boolean) => {
    triggerHaptic('light');
    setAutoRestTimer(val);
    if (!val) {
      setRestAlert('none');
    } else {
      setRestAlert('both');
    }
  };

  const handleUnitChange = (newUnit: 'kg' | 'lb') => {
    if (newUnit === unit) return;
    triggerHaptic('selection');
    setUnit(newUnit);
    // Ajusta o incremento padrão se necessário (mínimo 0.5)
    if (newUnit === 'lb' && defaultIncrement < 1) {
      setDefaultIncrement(1.0);
    }
  };

  const handleResetCalibration = async () => {
    triggerHaptic('medium');
    await resetOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Onboarding' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Ajustes"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Cartão de Status do Sistema */}
        <Card variant="surface" style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusTitleLeft}>
              <View style={styles.statusIconCircle}>
                <Zap size={22} color={colors.primary} fill={colors.primary} />
              </View>
              <View>
                <Text variant="headline" style={styles.statusTitle}>
                  Tudo configurado
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Pronto para treinar
                </Text>
              </View>
            </View>

            <View style={styles.offlineBadge}>
              <View style={styles.dotIndicator} />
              <Text variant="labelSmall" color="coral" style={styles.offlineBadgeText}>
                100% offline
              </Text>
            </View>
          </View>

          <Text variant="bodySmall" color="secondary" style={styles.statusDescription}>
            Seus registros ficam direto no dispositivo. Sem sinal, sem espera.
          </Text>
        </Card>

        {/* Seção: Perfil do atleta */}
        <View style={styles.sectionContainer}>
          <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
            Perfil
          </Text>

          <Card variant="surface" style={styles.groupedCard}>
            <View style={{ padding: 16 }}>
              <TextField
                label="Nome do atleta (opcional)"
                placeholder="Ex: Marcos"
                value={nameInput}
                onChangeText={(val) => {
                  setNameInput(val);
                  setUserName(val);
                }}
                maxLength={30}
                showCounter
                helperText="Usado para saudações na aba Início. Se vazio, exibe 'Atleta'."
              />
            </View>
          </Card>
        </View>

        {/* 2. Seção: Preferências de treino */}
        <View style={styles.sectionContainer}>
          <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
            Preferências de treino
          </Text>

          <Card variant="surface" style={styles.groupedCard}>
            {/* Linha 1: Unidade de medida */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={styles.rowTitle}>
                  Unidade de medida
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Só altera a exibição; seus registros não são modificados.
                </Text>
              </View>

              <SegmentedControl
                options={[
                  { label: 'kg', value: 'kg' },
                  { label: 'lb', value: 'lb' },
                ]}
                value={unit}
                onChange={(val) => handleUnitChange(val as 'kg' | 'lb')}
                style={styles.unitControl}
              />
            </View>

            <View style={styles.divider} />

            {/* Linha 2: Incremento padrão */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={styles.rowTitle}>
                  Incremento padrão
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Ajuste rápido entre séries
                </Text>
              </View>

              <Stepper
                value={defaultIncrement}
                step={unit === 'lb' ? 1.0 : 0.5}
                min={0.5}
                max={unit === 'lb' ? 20 : 10}
                unit={unit}
                size="compact"
                formatValue={(val) => `+${String(val).replace('.', ',')} ${unit}`}
                onChange={(val) => setDefaultIncrement(val)}
              />
            </View>

            <View style={styles.divider} />

            {/* Linha 3: Timer de descanso automático */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={styles.rowTitle}>
                  Timer de descanso automático
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Inicia contagem regressiva ao finalizar a série
                </Text>
              </View>

              <Switch
                value={autoRestTimer}
                onValueChange={handleToggleAutoTimer}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>

            <View style={styles.divider} />

            {/* Linha 4: Alerta sonoro e vibração */}
            <View style={[styles.settingRow, !autoRestTimer && styles.disabledRow]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={styles.rowTitle}>
                  Alerta sonoro e vibração
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Avisa o término do descanso em segundo plano
                </Text>
              </View>

              <Switch
                value={isAlertEnabled && autoRestTimer}
                disabled={!autoRestTimer}
                onValueChange={handleToggleAlert}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </Card>

          {/* Legenda explicativa de cálculo de carga */}
          <View style={styles.infoNoteBox}>
            <Info size={16} color={colors.primary} strokeWidth={1.75} style={styles.infoIcon} />
            <Text variant="bodySmall" color="secondary" style={styles.infoNoteText}>
              Carga total = soma de carga × repetições, sem aquecimento; em halteres conta o par.
            </Text>
          </View>
        </View>

        {/* 3. Seção: Armazenamento e dados */}
        <View style={styles.sectionContainer}>
          <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
            Armazenamento e dados
          </Text>

          <Card variant="surface" style={styles.groupedCard}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('Backup');
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Backup e dados locais: exportar, importar e restaurar fichas"
              style={({ pressed }) => [
                styles.linkRow,
                pressed && styles.linkRowPressed,
              ]}
            >
              <View style={styles.linkLeft}>
                <View style={styles.linkIconCircle}>
                  <FolderArchive size={20} color={colors.primary} strokeWidth={1.75} />
                </View>
                <View style={styles.linkTexts}>
                  <Text variant="bodyLarge" style={styles.rowTitle}>
                    Backup e dados locais
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Exportar, importar e restaurar fichas
                  </Text>
                </View>
              </View>

              <ChevronRight size={20} color={colors.outline} strokeWidth={1.75} />
            </Pressable>
          </Card>
        </View>

        {/* 4. Seção: Sobre o aplicativo */}
        <View style={styles.sectionContainer}>
          <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
            Sobre o aplicativo
          </Text>

          {/* Bloco de Marca e Versão */}
          <Card variant="surface" style={styles.brandCard}>
            <View style={styles.brandLogoCircle}>
              <Zap size={24} color={colors.primary} fill={colors.primary} />
            </View>
            <View>
              <Text variant="headline" style={styles.brandTitle}>
                Volt Precision
              </Text>
              <Text variant="bodySmall" color="secondary">
                {`Versão ${APP_VERSION} · Build ${APP_BUILD}`}
              </Text>
            </View>
          </Card>

          {/* Bloco de Privacidade com Escudo */}
          <Card variant="high" style={styles.privacyCard}>
            <View style={styles.shieldCircle}>
              <ShieldCheck size={20} color={colors.pr} strokeWidth={1.75} />
            </View>
            <Text variant="bodySmall" color="secondary" style={styles.privacyCardText}>
              Seus dados ficam salvos exclusivamente neste aparelho. Sem login, sem rastreadores e sem publicidade.
            </Text>
          </Card>

          {/* Links Secundários */}
          <Card variant="surface" style={styles.groupedCard}>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setNotesSheetOpen(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ver notas de atualização"
              style={({ pressed }) => [
                styles.simpleLinkRow,
                pressed && styles.linkRowPressed,
              ]}
            >
              <Text variant="bodyMedium" style={styles.rowTitle}>
                Notas de atualização
              </Text>
              <ChevronRight size={20} color={colors.outline} strokeWidth={1.75} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setLicensesSheetOpen(true);
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Ver licenças open source"
              style={({ pressed }) => [
                styles.simpleLinkRow,
                pressed && styles.linkRowPressed,
              ]}
            >
              <Text variant="bodyMedium" style={styles.rowTitle}>
                Licenças open source
              </Text>
              <ChevronRight size={20} color={colors.outline} strokeWidth={1.75} />
            </Pressable>
          </Card>
        </View>

        {/* 5. Seção de Testes e Desenvolvimento */}
        <View style={styles.sectionContainer}>
          <Text variant="labelSmall" color="secondary" style={styles.sectionLabel}>
            Desenvolvimento e calibração
          </Text>

          <Card variant="high" style={styles.groupedCard}>
            <View style={styles.devCardPadding}>
              <Button
                title="Refazer calibração inicial"
                variant="secondary"
                icon={<RotateCcw size={18} color={colors.onSurface} strokeWidth={1.75} />}
                onPress={handleResetCalibration}
                style={styles.devButton}
              />

              <Button
                title="Abrir galeria de componentes"
                variant="secondary"
                icon={<Sparkles size={18} color={colors.pr} strokeWidth={1.75} />}
                onPress={() => navigation.navigate('DevGallery')}
                style={styles.devButton}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Sheet: Notas de Atualização */}
      <BottomSheet
        visible={notesSheetOpen}
        onClose={() => setNotesSheetOpen(false)}
        title="Notas de atualização"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <Text variant="headline" style={styles.sheetSectionTitle}>
            Versão 1.0.0
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.sheetParagraph}>
            • Lançamento oficial da fundação do Volt Precision.
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.sheetParagraph}>
            • Modo 100% offline: persistência local segura com SQLite e Drizzle ORM.
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.sheetParagraph}>
            • Calibração inicial com seleção de unidades (kg/lb) e menor anilha.
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.sheetParagraph}>
            • Biblioteca com 46 exercícios pré-cadastrados cobrindo 6 grupos musculares.
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.sheetParagraph}>
            • Cálculo automático de volume de treino e detecção de recordes pessoais (PR).
          </Text>
        </ScrollView>
      </BottomSheet>

      {/* Sheet: Licenças Open Source */}
      <BottomSheet
        visible={licensesSheetOpen}
        onClose={() => setLicensesSheetOpen(false)}
        title="Licenças open source"
      >
        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <Text variant="headline" style={styles.sheetSectionTitle}>
            Softwares e bibliotecas
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.licenseItem}>
            <Text variant="bodyMedium" style={styles.boldText}>React Native & Expo</Text>
            {'\n'}MIT License — Copyright (c) Meta Platforms, Inc. & 650 Industries, Inc.
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.licenseItem}>
            <Text variant="bodyMedium" style={styles.boldText}>Drizzle ORM & expo-sqlite</Text>
            {'\n'}Apache License 2.0 / MIT License.
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.licenseItem}>
            <Text variant="bodyMedium" style={styles.boldText}>Zustand</Text>
            {'\n'}MIT License — Copyright (c) 2019 Paul Henschel.
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.licenseItem}>
            <Text variant="bodyMedium" style={styles.boldText}>Lucide Icons</Text>
            {'\n'}ISC License — Copyright (c) Lucide Contributors.
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.licenseItem}>
            <Text variant="bodyMedium" style={styles.boldText}>Outfit & DM Sans Fonts</Text>
            {'\n'}SIL Open Font License 1.1.
          </Text>
        </ScrollView>
      </BottomSheet>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  statusCard: {
    gap: spacing.sm,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 6,
  },
  dotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  offlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDescription: {
    lineHeight: 18,
    marginTop: 2,
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
  groupedCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  disabledRow: {
    opacity: 0.45,
  },
  settingInfo: {
    flex: 1,
    paddingRight: spacing.xs,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  unitControl: {
    minWidth: 100,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    width: '100%',
  },
  infoNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: 4,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoNoteText: {
    flex: 1,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
  },
  linkRowPressed: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  linkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTexts: {
    flex: 1,
    gap: 2,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.cardPadding,
  },
  brandLogoCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  shieldCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  privacyCardText: {
    flex: 1,
    lineHeight: 18,
  },
  simpleLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.cardPadding,
    minHeight: spacing.touchTargetMin,
  },
  devCardPadding: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  devButton: {
    width: '100%',
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetSectionTitle: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  sheetParagraph: {
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  licenseItem: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: colors.onSurface,
  },
});
