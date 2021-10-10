import React, { useCallback, useRef, useState, useEffect } from 'react';
import styles from './index.scss';
import InputWithLabel from '~components/InputWithLabel';
import NextStepButton from '~components/NextStepButton';
import Warning from '~components/Warning';
import Header from '~components/Header';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import clsx from 'clsx';
import { RouteComponentProps, withRouter } from 'react-router';
import { selectAccountById } from '~state/wallet';
import { useSelector } from 'react-redux';
import { send } from '@earthwallet/keyring';
import Secp256k1KeyIdentity from '@earthwallet/keyring/build/main/util/icp/secpk256k1/identity';
import { isJsonString } from '~utils/common';
import { principal_id_to_address, address_to_hex } from '@earthwallet/keyring/build/main/util/icp';
import { getSymbol } from '~utils/common';

import { decryptString } from '~utils/vault';
import { validateMnemonic, transfer, getFees } from '@earthwallet/keyring';
import { useController } from '~hooks/useController';
import { selectBalanceByAddress } from '~state/wallet';
import { selectAssetBySymbol } from '~state/assets';
import { DEFAULT_ICP_FEES } from '~global/constant';
import indexToHash from './indexToHash'
import { useHistory } from 'react-router-dom';
import { selectAssetsICPByAddress } from '~state/wallet';
import ICON_CARET from '~assets/images/icon_caret.svg';
import useQuery from '~hooks/useQuery';
import { transferNFTsExt } from '@earthwallet/assets';

const MIN_LENGTH = 6;

interface keyable {
  [key: string]: any
}

interface Props extends RouteComponentProps<{ address: string }> {
}

const WalletSendTokens = ({
  match: {
    params: { address },
  },
}: Props) => {

  const [step1, setStep1] = useState(true);
  const selectedAccount = useSelector(selectAccountById(address));
  const controller = useController();
  const currentBalance: keyable = useSelector(selectBalanceByAddress(address));
  const currentUSDValue: keyable = useSelector(selectAssetBySymbol(getSymbol(selectedAccount?.symbol)?.coinGeckoId || ''));

  const assets: keyable = useSelector(selectAssetsICPByAddress(address));


  const dropDownRef = useRef(null);
  const [selectedRecp, setSelectedRecp] = useState<string>('');
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [pass, setPass] = useState('');
  const [recpError, setRecpError] = useState('');

  const [error, setError] = useState('');
  const [txError, setTxError] = useState('');
  const [fees, setFees] = useState<number>(0);

  const [loadingSend, setLoadingSend] = useState<boolean>(false);
  const [selectCredit, setSelectCredit] = useState<boolean>(true);
  const [selectedAsset, setSelectAsset] = useState<string>('');
  const [toggleAssetDropdown, setToggleAssetDropdown] = useState<boolean>(false);
  const queryParams = useQuery();



  const toggle = React.useCallback(() => {
    setToggleAssetDropdown((v) => !v);
  }, []);

  const toggleAndSetAsset = React.useCallback((asset: string) => {
    toggle();
    setSelectAsset(asset);
  }, []);


  const [isBusy, setIsBusy] = useState(false);
  const [paymentHash, setPaymentHash] = useState<string>('');
  const history = useHistory();

  useEffect(() => {
    if (queryParams.get('assetid') === null) {
      setSelectAsset(selectedAccount?.symbol)
    }
    else {
      setSelectAsset(queryParams.get('assetid') || '');
    }
  }, [queryParams.get('assetid') !== null]);

  useEffect(() => {
    controller.accounts
      .getBalancesOfAccount(selectedAccount)
      .then(() => {
      });

    if (selectedAccount?.symbol !== 'ICP') {
      getFees(selectedAccount?.symbol).then(fees => {
        const BTC_DECIMAL = 8;
        setFees(fees.fast.amount().shiftedBy(-1 * BTC_DECIMAL).toNumber());
      })
    }
    else {
      setFees(DEFAULT_ICP_FEES);
    }
  }, [selectedAccount?.id === address]);


  const loadMaxAmount = useCallback((): void => {
    if (parseFloat(currentBalance?.value) === 0) {
      setError(`Not enough balance. Transaction fees is ${fees} ${selectedAccount?.symbol}`);
    }
    else {
      let maxAmount = currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));
      setSelectedAmount(parseFloat(maxAmount.toFixed(8)));
    }
  }, [currentBalance, fees]);

  const onConfirm = useCallback(() => {
    if (selectedAsset !== selectedAccount.symbol) {
      setError('');
      setStep1(false);
    }
    else {
      let maxAmount = currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));
      if (selectedAmount !== 0 && selectedAmount <= maxAmount) {
        setError('');
        setStep1(false);
      }
      else if (selectedAmount === 0) {
        setError(`Amount cannot be zero. Transaction fees is ${fees} ${selectedAccount?.symbol}`);
        setStep1(true);
      }
      else {
        setError(`Please check entered amount. Transaction fees is ${fees} ${selectedAccount?.symbol}`);
        setStep1(true);
      }
    }

  }, [fees, selectedAmount, currentBalance, selectedAccount, selectedAsset]);

  const onBackClick = useCallback(() => { setStep1(true); }, []);
  const transferForAll = async () => {
    setIsBusy(true);
    setTxError('');
    let mnemonic = '';
    try {
      mnemonic = decryptString(selectedAccount?.vault.encryptedMnemonic, pass);
    } catch (error) {
      setError('Wrong password! Please try again');
      setIsBusy(false);
    }
    try {
      if (selectedAmount === 0) {
        alert('Amount cannot be 0');
      }
      const hash: any = await transfer(
        selectedRecp,
        selectedAmount.toString(),
        mnemonic,
        selectedAccount?.symbol,
        { network: 'mainnet' }
      );

      await controller.accounts
        .getBalancesOfAccount(selectedAccount)
        .then(() => {
        });
      setLoadingSend(false);
      setPaymentHash(hash || '');
      setIsBusy(false);
    } catch (error) {
      console.log(error);
      setTxError('Unable to send! Please try again later');
      setLoadingSend(false);
      setIsBusy(false);
    }

  }

  const getSelectedAsset = (assetId: string) => assets.filter((asset: keyable) => asset.tokenIdentifier === assetId)[0]


  const sendNFTICP = async (assetId: string, fromIdentity: any, toAccountId: string) => {
    let status
    //todo:send and clear All NFTs from redux cache for that address
    if (typeof fromIdentity.toUint8Array === 'function') {
      status = await transferNFTsExt(getSelectedAsset(assetId).canisterId, fromIdentity, toAccountId, getSelectedAsset(selectedAsset).tokenIndex);

    }
    else {
      console.log(fromIdentity.toUint8Array(), fromIdentity)
      const blob = fromIdentity.toBlob();
      fromIdentity.toUint8Array = () => blob;
      console.log(typeof fromIdentity.toUint8Array, fromIdentity, typeof fromIdentity.toBlob, 'else')
      status = await transferNFTsExt(getSelectedAsset(assetId).canisterId, fromIdentity, toAccountId, getSelectedAsset(selectedAsset).tokenIndex);
    }

    console.log(status);
  }
  console.log(sendNFTICP);

  const tranfersAssetsICP = async () => {
    setIsBusy(true);
    setTxError('');

    let secret = '';

    try {
      secret = decryptString(selectedAccount?.vault.encryptedJson, pass);
    } catch (error) {
      setError('Wrong password! Please try again');
      setIsBusy(false);
    }

    if (isJsonString(secret)) {
      const currentIdentity = Secp256k1KeyIdentity.fromJSON(secret);
      const address = address_to_hex(
        principal_id_to_address(currentIdentity.getPrincipal())
      );

      setLoadingSend(true);
      if (selectedAsset === selectedAccount?.symbol) {
        try {
          if (selectedAmount === 0) {
            alert('Amount cannot be 0');
          }
          const index: BigInt = await send(
            currentIdentity,
            selectedRecp,
            address,
            selectedAmount,
            'ICP'
          );

          const hash: string = await indexToHash(index);


          await controller.accounts
            .getBalancesOfAccount(selectedAccount)
            .then(() => {
              if (hash !== null) {
                history.replace(`/account/transaction/${hash}`)
              }
              else {
                setLoadingSend(false);
                setPaymentHash(index.toString() || '');
                setIsBusy(false);
              }
            });

        } catch (error) {
          console.log(error);
          setTxError("Please try again! Error: " + JSON.stringify(error));
          setLoadingSend(false);
          setIsBusy(false);
        }
      } else {
        let status = await transferNFTsExt(getSelectedAsset(selectedAsset).canisterId, currentIdentity, selectedRecp, getSelectedAsset(selectedAsset).tokenIndex);

        console.log(status)
      }
    } else {
      setError('Wrong password! Please try again');
      setIsBusy(false);
    }

    return true;
  };

  const onPassChange = useCallback(
    (password: string) => {
      setPass(password);
      setError('');

      let secret = '';
      try {
        secret = selectedAccount?.symbol !== 'ICP'
          ? decryptString(selectedAccount?.vault.encryptedMnemonic, password)
          : decryptString(selectedAccount?.vault.encryptedJson, password);
      }
      catch (error) {
        setError('Wrong password! Please try again');
      }
      if (selectedAccount?.symbol === 'ICP' ? !isJsonString(secret) : !validateMnemonic(secret)) {
        setError('Wrong password! Please try again');
      }
    }
    , [selectedAccount]);

  const parseRecipientAndSetAddress = (recipient: string) => {
    if (selectedAccount?.symbol === 'ICP') {
      setSelectedRecp(recipient);
      const dashCount = (recipient.match(/-/g) || []).length;
      if (dashCount === 5 || dashCount === 10) {
        setRecpError('Principal id is not accepted! Please enter account id ')
      }
      else {
        setRecpError('');
      }
    }
    else {
      setSelectedRecp(recipient);
    }
  };

  return <div className={styles.page}><>
    <Header
      backOverride={step1 ? undefined : paymentHash === '' ? onBackClick : undefined}
      centerText
      showMenu
      text={'Send'}
      type={'wallet'} />
    <div className={styles.pagecont}
      ref={dropDownRef}
    >
      {!(paymentHash === undefined || paymentHash === '') && <div

        className={styles.paymentDone}>
        Payment Done! Check transactions for more details.
      </div>}
      {step1
        ? <div style={{ width: '100vw' }}>
          <div className={styles.earthInputLabel}>Add recipient</div>
          <input
            autoCapitalize='off'
            autoCorrect='off'
            autoFocus={true}
            className={clsx(styles.earthinput, styles.recipientAddress)}
            key={'recp'}
            onChange={(e) => parseRecipientAndSetAddress(e.target.value)}
            placeholder="Recipient address"
            required
            value={selectedRecp}
          />
          {recpError !== '' && <Warning
            isBelowInput
            isDanger
            className={styles.warningRecp}
          >
            {recpError}
          </Warning>}
          <div className={styles.assetSelectionDivCont}>
            <div className={styles.earthInputLabel}>
              Asset
            </div>
            <div className={styles.tokenSelectionDiv}>
              {selectedAsset === selectedAccount?.symbol && <SelectedAsset
                onSelectedAssetClick={toggle}
                label={selectedAccount?.symbol}
                logo={getSymbol(selectedAccount?.symbol)?.icon || ''}
                loading={currentBalance?.loading}
                balanceText={currentBalance === null
                  ? `Balance: `
                  : `Balance: ${currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals)} ${currentBalance?.currency?.symbol}`
                }
              />}
              {getSelectedAsset(selectedAsset) && <SelectedAsset
                onSelectedAssetClick={toggle}
                label={getSelectedAsset(selectedAsset).tokenIndex}
                loading={false}
                balanceText={'1 NFT'}
                logo={`https://${getSelectedAsset(selectedAsset).canisterId}.raw.ic0.app/?tokenid=${getSelectedAsset(selectedAsset).tokenIdentifier}`}
              />
              }
              {toggleAssetDropdown &&
                <div className={styles.assetOptions}>
                  <AssetOption
                    onAssetOptionClick={() => toggleAndSetAsset(selectedAccount?.symbol || '')}
                    label={selectedAccount?.symbol}
                    logo={getSymbol(selectedAccount?.symbol)?.icon || ''}
                    balanceText={currentBalance === null
                      ? `Balance: `
                      : `Balance: ${currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals)} ${currentBalance?.currency?.symbol}`
                    }
                  />
                  {assets?.map((asset: keyable, index: number) => <AssetOption
                    key={index}
                    onAssetOptionClick={() => toggleAndSetAsset(asset?.tokenIdentifier || index)}
                    label={asset?.tokenIndex}
                    logo={`https://${asset?.canisterId}.raw.ic0.app/?tokenid=${asset?.tokenIdentifier}`}
                    balanceText={'1 NFT'}
                  />
                  )}
                </div>
              }
            </div>
          </div>
          {selectedAsset === selectedAccount?.symbol && <div>
            <div
              className={styles.earthInputLabel}>
              Amount  {selectedAccount?.symbol !== 'BTC' && <div
                onClick={() => loadMaxAmount()}
                className={styles.maxBtn}>Max</div>}
            </div>
            <input
              autoCapitalize='off'
              autoCorrect='off'
              autoFocus={false}
              className={clsx(styles.recipientAddress, styles.earthinput)}
              key={'amount'}
              max="1.00"
              min="0.00"
              onChange={(e) => setSelectedAmount(parseFloat(e.target.value))}
              placeholder="amount up to 8 decimal places"
              required
              step="0.001"
              type="number"
              value={selectedAmount}
            />
            {error && (
              <div
                className={styles.noBalanceError}
              >
                <Warning
                  isBelowInput
                  isDanger
                >
                  {error}
                </Warning>
              </div>
            )}
          </div>}
        </div>
        : <div className={styles.confirmPage}>
          {selectedAsset === selectedAccount?.symbol ? <div className={styles.confirmAmountCont}>
            <img
              className={clsx(styles.tokenLogo, styles.tokenLogoConfirm)}
              src={getSymbol(selectedAccount?.symbol)?.icon}

            />
            <div>
              <div className={styles.tokenText}>{getSymbol(selectedAccount?.symbol)?.name}</div>
              <div className={styles.tokenAmount}>{selectedAmount} {selectedAccount?.symbol}</div>
              <div className={styles.tokenValue}>${(selectedAmount * currentUSDValue?.usd).toFixed(3)}</div>
            </div>

          </div>
            : <div className={styles.confirmAmountCont}>
              <img
                className={clsx(styles.tokenLogo, styles.tokenLogoConfirm)}
                src={`https://${getSelectedAsset(selectedAsset).canisterId}.raw.ic0.app/?tokenid=${getSelectedAsset(selectedAsset)?.tokenIdentifier}`}
              />
              <div>
                <div className={styles.tokenText}>{getSelectedAsset(selectedAsset).tokenIndex}</div>
                <div className={styles.tokenAmount}>1 NFT</div>
              </div>

            </div>
          }
          {selectedAsset === selectedAccount?.symbol && <div className={styles.feeCont}>
            <div className={styles.feeRow}>
              <div className={styles.feeTitle}>Transaction Fee</div>
              <div>
                <div className={styles.feeAmount}>{fees} {selectedAccount?.symbol}</div>
                <div className={styles.feeValue}>${(fees * currentUSDValue?.usd).toFixed(2)}</div>
              </div>
            </div>
            {false && selectCredit && <div className={styles.feeRow}>
              <div className={styles.feeTitle}>Earth Credit<span
                onClick={() => setSelectCredit(false)}
                className={styles.removeBtn}>Remove</span></div>
              <div>
                <div className={styles.feeAmount}>You Recieve</div>
                <div className={styles.feeValue}>1.50 EARTH</div>
              </div>
            </div>}
            <div className={styles.feeRow}>
              <div className={styles.feeTotal}>Total</div>
              <div>
                <div className={styles.feeAmount}>{(selectedAmount + fees).toFixed(currentBalance?.currency?.decimals)}</div>
                <div className={styles.feeValue}>${((selectedAmount + fees) * currentUSDValue?.usd).toFixed(3)}</div>
              </div>
            </div>

          </div>}
          <InputWithLabel
            data-export-password
            disabled={isBusy}
            isError={pass.length < MIN_LENGTH || !!error}
            label={'password for this account'}
            onChange={onPassChange}
            placeholder='REQUIRED'
            type='password'
          />
          {error && (
            <Warning
              isBelowInput
              isDanger
            >
              {error}
            </Warning>
          )}
        </div>}

      {txError && (
        <div
          className={styles.noBalanceError}
        ><Warning
          isBelowInput
          isDanger
        >
            {txError}
          </Warning></div>
      )}
    </div>
    <div style={{
      margin: '0 30px 30px 30px',
      position: 'absolute',
      bottom: 0,
      left: 0
    }}>
      {step1
        ? <NextStepButton
          disabled={loadingSend || !selectedRecp}
          loading={isBusy}
          onClick={onConfirm}>
          {'Next'}
        </NextStepButton>

        : <NextStepButton
          disabled={loadingSend || !!error || pass.length < MIN_LENGTH || !(paymentHash === undefined || paymentHash === '')}
          loading={isBusy || loadingSend}
          onClick={() => selectedAccount?.symbol === 'ICP' ? tranfersAssetsICP() : transferForAll()}>
          {'Send'}
        </NextStepButton>}
    </div>
  </></div>;
};


interface SelectedAssetProps {
  logo: string,
  label: string,
  loading: boolean,
  balanceText: string,
  onSelectedAssetClick: () => void
}

interface AssetOptionProps {
  logo: string,
  label: string,
  balanceText: string,
  onAssetOptionClick: () => void
}

const SelectedAsset = ({ logo, label, loading, balanceText, onSelectedAssetClick }: SelectedAssetProps) => <div
  onClick={onSelectedAssetClick}
  className={styles.selectedNetworkDiv}>
  <img
    className={styles.tokenLogo}
    src={logo}
  />
  <div className={styles.tokenSelectionLabelDiv}>
    <div className={styles.tokenLabel}>{label}</div>
    <div className={styles.tokenBalance}>
      {loading
        ? <SkeletonTheme color="#222"
          highlightColor="#000">
          <Skeleton width={150} />
        </SkeletonTheme>
        : <span className={styles.tokenBalanceText}>{balanceText}</span>
      }
    </div>
  </div>
  <img className={styles.iconcaret} src={ICON_CARET} />
</div>

const AssetOption = ({ logo, label, balanceText, onAssetOptionClick }: AssetOptionProps) => <div
  onClick={onAssetOptionClick}
  className={clsx(styles.selectedNetworkDiv, styles.selectedNetworkDivOption)}>
  <img
    className={styles.tokenLogo}
    src={logo}
  />
  <div className={styles.tokenSelectionLabelDiv}>
    <div className={styles.tokenLabel}>{label}</div>
    <div className={styles.tokenBalance}>
      <span className={styles.tokenBalanceText}>{balanceText}</span>
    </div>
  </div>
</div>
export default withRouter(WalletSendTokens);