import { browser } from 'webextension-polyfill-ts';
import { EarthProvider } from '~scripts/Provider/EarthProvider';
import type { IAccountsController } from '../types/IAccountsController';
import type { IAssetsController, keyable } from '../types/IAssetsController';
import { IDAppController } from '../types/IDAppController';
import AccountsController from './AccountsController';
import AssetsController from './AssetsController';
import DAppController from './DAppController';
import TokensController from './TokensController';

import store from '~state/store';
import { preloadStateAsync } from '~state/app';
import { storeEntities } from '~state/entities';
import { NetworkSymbol } from '~global/types';
import { updateOverrideEthereum } from '~state/wallet';

export default class MainController {
  accounts: Readonly<IAccountsController>;
  assets: Readonly<IAssetsController>;
  dapp: Readonly<IDAppController>;
  provider: Readonly<EarthProvider>;
  tokens: Readonly<TokensController>;
  constructor() {
    this.accounts = Object.freeze(new AccountsController());
    this.assets = Object.freeze(new AssetsController());
    this.dapp = Object.freeze(new DAppController());
    this.tokens = Object.freeze(new TokensController());
    this.provider = Object.freeze(new EarthProvider());
  }

  isHydrated() {
    return store.getState().app.hydrated;
  }

  async preloadState() {
    await store.dispatch(preloadStateAsync() as any);
  }

  async migrateLocalStorage() {
    const items = { ...localStorage };
    const existingAccounts = Object.keys(items)
      .filter((key: string) => key.includes('_mnemonic'))
      .map((key: string) => {
        const address = key.replace('_mnemonic', '');
        const pair = {
          id: address,
          address,
          groupId: address,
          meta: {
            name: address,
            importedAt: Math.round(new Date().getTime() / 1000),
            type: 'Ed25519',
            principalId: null,
          },
          vault: {
            encryptedMnemonic: items[key],
            encryptedJson: items[key.replace('_mnemonic', '_icpjson')],
            encryptionType: 'PBKDF2',
          },
          symbol: 'ICP_Ed25519',
          order: 0,
          active: true,
        };
        return pair;
      });

    store.dispatch(
      storeEntities({
        entity: 'accounts',
        data: existingAccounts,
      })
    );

    return items as keyable;
  }

  async createPopup(windowId: string, route?: string, asset?: NetworkSymbol) {
    const _window = await browser.windows.getCurrent();
    if (!_window || !_window.width) return null;

    if (asset) {
      this.accounts.updateActiveNetwork(asset);
    }

    let url = `/dapp.html?`;
    if (route) {
      url += `&route=${route}`;
    }
    url += `&windowId=${windowId}`;
    url += `#${windowId}`;

    return await browser.windows.create({
      url,
      width: 375,
      height: 600,
      type: 'popup',
      top: 0,
      left: _window.width - 375,
    });
  }

  updateOverrideEthereum(state: boolean) {
    store.dispatch(updateOverrideEthereum(state));
  }
}
