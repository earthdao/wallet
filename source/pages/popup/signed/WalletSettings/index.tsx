import React from 'react';
import styles from './index.scss';
import ICON_FORWARD from '~assets/images/icon_forward.svg';
import ICON_CHECKED from '~assets/images/icon_checkbox_checked.svg';
import ICON_UNCHECKED from '~assets/images/icon_checkbox_unchecked.svg';

//import Loading from '~components/Loading';
import Header from '~components/Header';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectConnectedDapps } from '~state/dapp';
import { getShortAddress } from '~utils/common';
import { keyable } from '~scripts/Background/types/IMainController';
import { AppState } from '~state/store';
import { useController } from '~hooks/useController';

const WalletSettings = () => {
  const history = useHistory();
  const dapps = useSelector(selectConnectedDapps);
  const { overrideEthereum } = useSelector((state: AppState) => state.wallet);
  const controller = useController();

  const toggleClickOverride = () => {
    controller.updateOverrideEthereum(!overrideEthereum);
  };

  return (
    <div className={styles.page}>
      <Header type={'wallet'} text={'Settings'}>
        <div className={styles.empty} />
      </Header>
      <div className={styles.container}>
        <div className={styles.earthInputCont}>
          <div className={styles.labelText}>Default Web3 Provider</div>
          <div className={styles.checkOverride}>
            {overrideEthereum ? (
              <img
                className={styles.checkboxIcon}
                onClick={toggleClickOverride}
                src={ICON_CHECKED}
              />
            ) : (
              <img
                className={styles.checkboxIcon}
                onClick={toggleClickOverride}
                src={ICON_UNCHECKED}
              />
            )}
            <div className={styles.overrideLabel}>
              Check this box to use Earth Wallet as your default Web3 wallet
              provider
            </div>
          </div>
        </div>
        <div className={styles.earthInputCont}>
          <div className={styles.labelText}>Connected Dapps</div>
        </div>
        <div className={clsx(styles.earthInputCont, styles.mnemonicInputCont)}>
          {dapps.length !== 0 &&
            dapps?.map((dapp: keyable) => (
              <div
                onClick={() =>
                  history.push(
                    '/dappdetails/' + encodeURIComponent(dapp?.origin)
                  )
                }
                key={dapp.origin}
                className={styles.checkboxCont}
              >
                <div className={styles.checkboxContent}>
                  <img src={dapp?.logo} className={styles.networkIcon} />
                  <div>
                    <div className={styles.checkboxTitle}>
                      {dapp?.origin} {dapp?.title}
                    </div>
                    <div className={styles.checkboxSubTitle}>
                      {dapp?.address && getShortAddress(dapp?.address)}
                    </div>
                  </div>
                </div>
                <img src={ICON_FORWARD} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default WalletSettings;
