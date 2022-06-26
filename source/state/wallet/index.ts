import { EarthKeyringPair } from '@earthwallet/keyring';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NetworkSymbol, NETWORK_TITLE } from '~global/types';

import type { IWalletState, NetworkInfo } from './types';
//import type { StoreInterface } from '~state/IStore';
import { AppState } from '~state/store';
import groupBy from 'lodash/groupBy';
import { getTokenInfo } from '~global/tokens';
import { getTokenImageURL } from '~global/nfts';

const initialState: IWalletState = {
  accounts: [],
  activeAccount: null,
  newMnemonic: '',
  loading: false,
  error: '',
  activeNetwork: {
    title: NETWORK_TITLE[NetworkSymbol.ICP],
    symbol: NetworkSymbol.ICP,
  },
  overrideEthereum: false,
  extensionId: '',
  restoreInActiveAccounts_ETH: false,
};

const WalletState = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    updateAccounts(
      state: IWalletState,
      action: PayloadAction<EarthKeyringPair[]>
    ) {
      state.accounts = action.payload;
    },
    updateNewMnemonic(state: IWalletState, action: PayloadAction<string>) {
      state.newMnemonic = action.payload;
    },
    updateExtensionId(state: IWalletState, action: PayloadAction<string>) {
      state.extensionId = action.payload;
    },
    updateRestoreInActiveAccounts_ETH(
      state: IWalletState,
      action: PayloadAction<boolean>
    ) {
      state.restoreInActiveAccounts_ETH = action.payload;
    },
    updateError(state: IWalletState, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    updateLoading(state: IWalletState, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    updateActiveAccount(
      state: IWalletState,
      action: PayloadAction<EarthKeyringPair & { id: string }>
    ) {
      state.activeAccount = action.payload;
    },
    updateActiveNetwork(
      state: IWalletState,
      action: PayloadAction<NetworkInfo>
    ) {
      state.activeNetwork = action.payload;
    },
    updateOverrideEthereum(
      state: IWalletState,
      action: PayloadAction<boolean>
    ) {
      state.overrideEthereum = action.payload;
    },
    hydrateWallet(state: IWalletState, action: PayloadAction<IWalletState>) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  updateAccounts,
  updateActiveAccount,
  updateActiveNetwork,
  updateNewMnemonic,
  updateExtensionId,
  updateError,
  updateLoading,
  updateOverrideEthereum,
  hydrateWallet,
  updateRestoreInActiveAccounts_ETH,
} = WalletState.actions;

export const selectAccounts = (state: AppState) =>
  Object.keys(state.entities.accounts.byId).map(
    (id) => state.entities.accounts.byId[id]
  );

export const selectAccounts_ICP = (state: AppState) =>
  Object.keys(state.entities.accounts.byId)
    .map((id) => state.entities.accounts.byId[id])
    .filter((account) => account.symbol === 'ICP');

export const selectAccountsByNetwork = (network: string) => (state: AppState) =>
  Object.keys(state.entities.accounts.byId)
    .map((id) => state.entities.accounts.byId[id])
    .filter((account) => account.symbol === network);

export const selectAccountsByGroupId = (groupId: string) => (state: AppState) =>
  Object.keys(state.entities.accounts.byId)
    .map((id) => state.entities.accounts.byId[id])
    .filter((account) => account.groupId === groupId)
    .sort((a, b) => a.order - b.order);

export const selectActiveAccountsByGroupId =
  (groupId: string) => (state: AppState) =>
    Object.keys(state.entities.accounts.byId)
      .map((id) => state.entities.accounts.byId[id])
      .filter((account) => account.groupId === groupId && account.active)
      .sort((a, b) => a.order - b.order);

export const selectAccountGroups = (state: AppState) => {
  const accountGroupsObject = groupBy(
    Object.keys(state.entities.accounts.byId).map(
      (id) => state.entities.accounts.byId[id]
    ),
    'groupId'
  );
  return Object.keys(accountGroupsObject).map((id) => accountGroupsObject[id]);
};

export const selectActiveAccountGroups = (state: AppState) => {
  const accountGroupsObject = groupBy(
    Object.keys(state.entities.accounts.byId)
      .map((id) => state.entities.accounts.byId[id])
      .filter((account) => account.active),
    'groupId'
  );
  return Object.keys(accountGroupsObject).map((id) => accountGroupsObject[id]);
};

export const selectGroupBalanceByGroupIdAndSymbol =
  (groupId: string, symbol: string) => (state: AppState) => {
    return Object.keys(state.entities.accounts.byId)
      .map((id) => state.entities.accounts.byId[id])
      .filter((account) => account.groupId === groupId)
      .filter((account) => account.symbol === symbol);
  };

export const selectBalanceById = (address: string) => (state: AppState) =>
  state.entities.balances.byId[address];

export const selectBalanceInUSDByAddress =
  (address: string) => (state: AppState) =>
    state.entities.balances.byId[address].balanceInUSD;

export const selectGroupBalanceByAddress =
  (address: string) => (state: AppState) =>
    state.entities.groupbalances.byId[address];

export const selectAssetsICPCountByAddress =
  (address: string) => (state: AppState) =>
    state.entities.assetsCount?.byId[address];

export const selectAssetsByAddress = (address: string) => (state: AppState) => {
  return (
    state.entities.assets?.byId &&
    Object.keys(state.entities.assets?.byId)
      ?.map((id) => state.entities.assets.byId[id])
      .filter((assets) => assets.address === address)
  );
};

export const selectAssetsICPCountLoadingByAddress =
  (address: string) => (state: AppState) =>
    state.entities.assetsCount?.byId[address]?.loading;

export const selectAssetById = (id: string) => (state: AppState) =>
  state.entities.assets?.byId[id];

export const selectAccountById = (address: string) => (state: AppState) =>
  state.entities.accounts.byId[address];

export const selectOtherAccountsOf = (address: string) => (state: AppState) => {
  const selectedAccount = state.entities.accounts.byId[address];

  const selectedSymbol = selectedAccount.symbol;
  const otherAccounts =
    state.entities.accounts?.byId &&
    Object.keys(state.entities.accounts?.byId)
      ?.map((id) => state.entities.accounts.byId[id])
      .filter(
        (account) =>
          account.symbol == selectedSymbol &&
          account.address != address &&
          account.active
      );
  return otherAccounts;
};

export const selectRecentsOf =
  (address: string, tokenId: string | null) => (state: AppState) => {
    const selectedAccount = state.entities.accounts.byId[address];
    const selectedSymbol = selectedAccount.symbol;
    let recents;
    if (tokenId == undefined) {
      recents = Object.keys(state.entities.recents?.byId)
        ?.map((id) => ({ ...state.entities.recents.byId[id], address: id }))
        .filter((recent) => recent.symbol == selectedSymbol);
    } else if (getTokenInfo(tokenId).addressType == 'principal') {
      recents = Object.keys(state.entities.recents?.byId)
        ?.map((id) => ({ ...state.entities.recents.byId[id], address: id }))
        .filter(
          (recent) =>
            recent.symbol == selectedSymbol && recent.addressType == 'principal'
        );
    }
    return recents || {};
  };

export const selectDappActiveAccountAddress = (state: AppState) =>
  state.wallet?.activeAccount?.address;

export const selectGroupCountByGroupId =
  (groupId: string) => (state: AppState) => {
    const sameGroup = Object.keys(state.entities.accounts.byId)
      .map((id) => state.entities.accounts.byId[id])
      .filter((account) => account.groupId === groupId && account.active);

    var count = 0;
    sameGroup.forEach((account) => {
      const assetsByAddress =
        state.entities.assets?.byId &&
        Object.keys(state.entities.assets?.byId)
          ?.map((id) => state.entities.assets.byId[id])
          .filter((assets) => assets.address === account.address);
      count = count + assetsByAddress.length;
    });
    return count;
  };

export const selectActiveTokensAndAssetsByAddress =
  (address: string) => (state: AppState) => {
    const assets =
      (state.entities.assets?.byId &&
        Object.keys(state.entities.assets?.byId)
          ?.map((id) => ({
            ...state.entities.assets.byId[id],
            ...{
              format: 'nft',
              id: state.entities.assets.byId[id]?.tokenIdentifier || id,
              balanceTxt: '1 NFT',
              label: state.entities.assets.byId[id]?.tokenIndex,
              icon: getTokenImageURL(state.entities.assets.byId[id]),
            },
          }))
          .filter((assets) => assets.address === address)) ||
      [];
    const activeTokens =
      (state.entities.tokens?.byId &&
        Object.keys(state.entities.tokens?.byId)
          ?.map((id) => {
            const tokenInfo = getTokenInfo(
              state.entities.tokens.byId[id]?.tokenId
            );
            return {
              ...state.entities.tokens.byId[id],
              ...{
                format: 'token',
                type: tokenInfo.type,
                label: tokenInfo.symbol,
                id: state.entities.tokens.byId[id]?.tokenId,
                balanceTxt:
                  state.entities.tokens.byId[id]?.balanceTxt +
                  ' ' +
                  tokenInfo.symbol,
              },
            };
          })
          .filter((token) => token.address === address && token.active)) ||
      [];
    return [...activeTokens, ...assets];
  };

export default WalletState.reducer;
