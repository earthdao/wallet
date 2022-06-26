import type { EarthKeyringPair } from '@earthwallet/keyring';
import type {
  NetworkSymbol,
  // WalletAccounts,
} from '~global/types';

export interface NetworkInfo {
  title: string;
  symbol: NetworkSymbol;
}

export interface IWalletState {
  // accounts: WalletAccounts;
  accounts: EarthKeyringPair[];
  activeAccount: EarthKeyringPair | null;
  activeNetwork: NetworkInfo;
  newMnemonic: string;
  error: string;
  loading: boolean;
  extensionId: string;
  overrideEthereum: boolean;
  restoreInActiveAccounts_ETH: boolean;
}
