import { TurboModuleRegistry } from 'react-native';

// Polyfill seguro de window para compatibilidade com New Architecture / bridgeless
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

// Garante que o ExpoModulesCore instale globalThis.expo antes de qualquer importação
if (!(globalThis as any).expo) {
  try {
    (TurboModuleRegistry.get('ExpoModulesCore') as any)?.installModules();
  } catch (e) {
    // Ignora se módulo nativo ainda estiver inicializando
  }
}

// Fallback de segurança para garantir que globalThis.expo e EventEmitter existam
if (!(globalThis as any).expo) {
  (globalThis as any).expo = {
    EventEmitter: class FallbackEventEmitter {
      addListener() {
        return { remove: () => {} };
      }
      removeListener() {}
      emit() {}
      removeAllListeners() {}
      listenerCount() {
        return 0;
      }
    },
    modules: {},
  };
} else if (!(globalThis as any).expo.EventEmitter) {
  (globalThis as any).expo.EventEmitter = class FallbackEventEmitter {
    addListener() {
      return { remove: () => {} };
    }
    removeListener() {}
    emit() {}
    removeAllListeners() {}
    listenerCount() {
      return 0;
    }
  };
}
