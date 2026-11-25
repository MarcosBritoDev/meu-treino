import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Inicio: undefined;
  Treinos: undefined;
  Biblioteca: undefined;
  Progresso: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Ajustes: undefined;
  Backup: undefined;
  DevGallery: undefined;
  NewExercise: { initialName?: string; fromScreen?: 'Biblioteca' | 'AddExercises'; exerciseId?: string } | undefined;
  ExerciseDetail: { exerciseId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
