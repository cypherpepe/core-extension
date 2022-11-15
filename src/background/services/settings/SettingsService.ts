import { NetworkContractToken } from '@avalabs/chains-sdk';
import { OnStorageReady } from '@src/background/runtime/lifecycleCallbacks';
import { EventEmitter } from 'events';
import { singleton } from 'tsyringe';
import { NetworkService } from '../network/NetworkService';
import { StorageService } from '../storage/StorageService';
import { isTokenSupported } from '../tokens/utils/isTokenSupported';
import { Languages, SettingsEvents, TokensVisibility } from './models';
import { SettingsState, SETTINGS_STORAGE_KEY, ThemeVariant } from './models';
import { changeLanguage } from 'i18next';

const DEFAULT_SETTINGS_STATE: SettingsState = {
  currency: 'USD',
  customTokens: {},
  showTokensWithoutBalances: false,
  theme: ThemeVariant.DARK,
  tokensVisibility: {},
  isDefaultExtension: false,
  analyticsConsent: true,
  language: Languages.EN,
};

@singleton()
export class SettingsService implements OnStorageReady {
  private eventEmitter = new EventEmitter();
  constructor(
    private storageService: StorageService,
    private networkService: NetworkService
  ) {
    this.applySettings();
    this.networkService.activeNetworkChanged.add(() => {
      this.applySettings();
    });
  }

  onStorageReady(): void {
    this.applySettings();
  }

  private async applySettings() {
    let settings: SettingsState;
    try {
      settings = await this.getSettings();
      changeLanguage(settings.language);
    } catch (e) {
      return;
    }

    this.eventEmitter.emit(SettingsEvents.SETTINGS_UPDATED, settings);
  }

  async getSettings(): Promise<SettingsState> {
    const state = await this.storageService.load<SettingsState>(
      SETTINGS_STORAGE_KEY
    );

    const unEncryptedState =
      await this.storageService.loadUnencrypted<SettingsState>(
        SETTINGS_STORAGE_KEY
      );

    return {
      ...DEFAULT_SETTINGS_STATE,
      ...unEncryptedState,
      ...state,
    };
  }

  async addCustomToken(token: NetworkContractToken) {
    const network = this.networkService.activeNetwork;

    if (!network) {
      throw new Error('Unable to detect current network selection.');
    }

    const settings = await this.getSettings();

    const tokenAlreadyExists = await isTokenSupported(
      token.address,
      network,
      settings
    );

    if (tokenAlreadyExists) {
      throw new Error('Token already exists in the wallet.');
    }

    const newSettings: SettingsState = {
      ...settings,
      customTokens: {
        ...settings.customTokens,
        [network?.chainId]: {
          ...settings.customTokens[network?.chainId],
          [token.address.toLowerCase()]: token,
        },
      },
    };
    await this.saveSettings(newSettings);
  }

  async setAnalyticsConsent(consent: boolean) {
    const settings = await this.getSettings();
    await this.saveSettings({
      ...settings,
      analyticsConsent: !!consent,
    });
  }

  async toggleIsDefaultExtension() {
    const settings = await this.getSettings();
    await this.saveSettings({
      ...settings,
      isDefaultExtension: !settings.isDefaultExtension,
    });
  }

  async setCurrencty(currency: string) {
    const settings = await this.getSettings();

    await this.saveSettings({
      ...settings,
      currency,
    });
  }

  async setShowTokensWithNoBalance(show: boolean) {
    const settings = await this.getSettings();
    await this.saveSettings({
      ...settings,
      showTokensWithoutBalances: show,
    });
  }

  async setTheme(theme: ThemeVariant) {
    const settings = await this.getSettings();
    await this.saveSettings({
      ...settings,
      theme,
    });
  }

  async setTokensVisibility(visibility: TokensVisibility) {
    const settings = await this.getSettings();
    await this.saveSettings({
      ...settings,
      tokensVisibility: visibility,
    });
  }

  async setLanguage(language: Languages) {
    changeLanguage(language);
    const settings = await this.getSettings();
    const newSettings = {
      ...settings,
      language,
    };
    await this.saveSettings(newSettings);
  }

  private async saveSettings(state: SettingsState) {
    const language = state.language;
    await this.storageService.saveUnencrypted(SETTINGS_STORAGE_KEY, {
      language: state.language,
    });
    try {
      await this.storageService.save(SETTINGS_STORAGE_KEY, state);
      this.eventEmitter.emit(SettingsEvents.SETTINGS_UPDATED, state);
    } catch {
      this.eventEmitter.emit(SettingsEvents.SETTINGS_UPDATED, { language });
    }
  }

  addListener(event: SettingsEvents, callback: (data: unknown) => void) {
    this.eventEmitter.on(event, callback);
  }
}
