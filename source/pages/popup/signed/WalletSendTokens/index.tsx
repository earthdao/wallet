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
import Secp256k1KeyIdentity from '@earthwallet/keyring/build/main/util/icp/secpk256k1/identity';
import { isJsonString } from '~utils/common';
import { principal_to_address } from '@earthwallet/keyring/build/main/util/icp';
import { getSymbol } from '~utils/common';

import { decryptString } from '~utils/vault';
import { validateMnemonic, getFees } from '@earthwallet/keyring';
import { useController } from '~hooks/useController';
import { selectBalanceByAddress } from '~state/wallet';
import { selectAssetBySymbol } from '~state/assets';
import { DEFAULT_ICP_FEES } from '~global/constant';
import indexToHash from './indexToHash'
import { useHistory } from 'react-router-dom';
import { selectActiveTokensAndAssetsICPByAddress } from '~state/wallet';
import ICON_CARET from '~assets/images/icon_caret.svg';
import useQuery from '~hooks/useQuery';
import { listNFTsExt, transferNFTsExt } from '@earthwallet/assets';
import { getShortAddress } from '~utils/common';
import { getTokenImageURL } from '~global/nfts';
import AddressInput from '~components/AddressInput';
import { getTokenInfo } from '~global/tokens';
import { selectInfoBySymbolOrToken } from '~state/token';

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

  const assets: keyable = useSelector(selectActiveTokensAndAssetsICPByAddress(address));


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
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedAssetObj, setSelectedAssetObj] = useState<keyable>({});

  const [toggleAssetDropdown, setToggleAssetDropdown] = useState<boolean>(false);
  const queryParams = useQuery();




  const toggle = React.useCallback(() => {
    setToggleAssetDropdown((v) => !v);
  }, []);

  const toggleAndSetAsset = React.useCallback((asset: string) => {
    toggle();
    setSelectedAsset(asset);
    setSelectedAssetObj(getSelectedAsset(asset));
    setSelectedAmount(0);
  }, []);


  const [isBusy, setIsBusy] = useState(false);
  const [txCompleteTxt, setTxCompleteTxt] = useState<string>('');
  const history = useHistory();
  const tokenId = queryParams.get('tokenId');
  const assetId = queryParams.get('assetId');
  const queryRecipient = queryParams.get('recipient');

  useEffect(() => {
    if (queryRecipient !== null) {
      setSelectedRecp(queryRecipient)
    }

  }, [queryRecipient !== null]);

  useEffect(() => {
    if (assetId === null && tokenId === null) {
      setSelectedAsset(selectedAccount?.symbol)
    }
    else if (assetId !== null) {
      setSelectedAsset(assetId || '');
      setSelectedAssetObj(getSelectedAsset(assetId || ''))
    }
    else if (tokenId !== null) {
      setSelectedAsset(tokenId || '');
      setSelectedAssetObj(getSelectedAsset(tokenId || ''))
    }
  }, [assetId !== null, tokenId !== null]);


  useEffect(() => {
    controller.accounts
      .getBalancesOfAccount(selectedAccount)
      .then(() => {
      });
    tokenId !== null && controller.tokens.getTokenBalances(address);

    if (selectedAccount?.symbol === 'BTC') {
      setIsBusy(true);

      getFees(selectedAccount?.symbol).then(fees => {
        setIsBusy(false);
        const BTC_DECIMAL = 8;
        setFees(fees.fast.amount().shiftedBy(-1 * BTC_DECIMAL).toNumber());
      })
    }
    else if (selectedAccount?.symbol === 'ICP') {
      if (tokenId == null) {
        setFees(DEFAULT_ICP_FEES);
      }
      else {
        setFees(getTokenInfo(tokenId)?.sendFees);
      }
    }
  }, [selectedAccount?.id === address]);




  const onConfirm = useCallback(() => {
    if (selectedAsset !== selectedAccount?.symbol) {
      setError('');
      setStep1(false);
    }
    else {
      setStep1(false);

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
      if (selectedAccount?.symbol != 'BTC') {
        return;
      }
      const hash: any = await controller.accounts.sendBTC(
        selectedRecp,
        selectedAmount,
        mnemonic,
        address
      );

      await controller.accounts
        .getBalancesOfAccount(selectedAccount)
        .then(() => {
        });
      setLoadingSend(false);
      setTxCompleteTxt('Payment Done! Check transactions for more details.' || hash || '');
      setIsBusy(false);
    } catch (error) {
      console.log(error);
      setTxError('Unable to send! Please try again later');
      setLoadingSend(false);
      setIsBusy(false);
    }

  }

  const getSelectedAsset = (assetId: string) => assets.filter((asset: keyable) => asset.id === assetId)[0]

  const transferAssetsForICP = async () => {
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
      const address = principal_to_address(currentIdentity.getPrincipal());

      setLoadingSend(true);
      if (selectedAsset === selectedAccount?.symbol) {
        try {
          if (selectedAmount === 0) {
            alert('Amount cannot be 0');
          }
          const index: BigInt = await controller.accounts.sendICP(
            secret,
            selectedRecp,
            selectedAmount,
          );

          const hash: string = await indexToHash(index);


          await controller.accounts
            .getBalancesOfAccount(selectedAccount)
            .then(() => {
              if (hash !== undefined) {
                history.replace(`/account/transaction/${hash}`)
              }
              else {
                setLoadingSend(false);
                setTxCompleteTxt('Payment Done! Check transactions for more details.');
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
        if (getSelectedAsset(selectedAsset).type == 'DIP20') {
          const callback = (path: string) => console.log(path);
          controller.tokens.transferToken(secret, selectedAsset, selectedRecp, selectedAmount, address, callback).then(() => {

            setTxCompleteTxt('Successfully transferred to ' + getShortAddress(selectedRecp, 3));
            setLoadingSend(false);
            setIsBusy(false);
          });
        }
        else {
          try {
            if (selectedAssetObj?.forSale === true) {
              await listNFTsExt(selectedAssetObj?.canisterId, currentIdentity, selectedAssetObj?.tokenIndex, 0, true);
              await transferNFTsExt(selectedAssetObj?.canisterId, currentIdentity, selectedRecp, selectedAssetObj?.tokenIndex);
            }
            else {
              await transferNFTsExt(selectedAssetObj?.canisterId, currentIdentity, selectedRecp, selectedAssetObj?.tokenIndex);
            }

            setTxCompleteTxt('Successfully transferred NFT to ' + getShortAddress(selectedRecp, 3));
            setLoadingSend(false);
            setIsBusy(false);
            //update asset balances after tx
            controller.assets.updateTokenDetails({ id: selectedAsset, address: selectedRecp });
            controller.assets.getICPAssetsOfAccount({ address, symbol: 'ICP' });
            controller.assets.getICPAssetsOfAccount({ address: selectedRecp, symbol: 'ICP' });

          } catch (error) {
            console.log(error);
            setTxError("Please try again! Error: " + JSON.stringify(error));
            setLoadingSend(false);
            setIsBusy(false);
          }

        }
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




  return <div className={styles.page}><>
    <Header
      backOverride={step1 ? undefined : txCompleteTxt === '' ? onBackClick : undefined}
      centerText
      showMenu
      text={'Send'}
      type={'wallet'} />
    <div className={styles.pagecont}
      ref={dropDownRef}
    >
      {!(txCompleteTxt === undefined || txCompleteTxt === '') && <div
        className={styles.paymentDone}>
        {txCompleteTxt}
      </div>}
      {step1
        ? <div style={{ width: '100vw' }}>
          <div className={styles.earthInputLabel}>Add recipient</div>
          <AddressInput
            initialValue={selectedRecp}
            recpErrorCallback={setRecpError}
            recpCallback={setSelectedRecp}
            inputType={selectedAccount?.symbol}
            autoFocus={true}
            tokenId={getSelectedAsset(selectedAsset)?.tokenId}
          />
          <div className={styles.assetSelectionDivCont}>
            <div className={styles.earthInputLabel}>
              Asset
            </div>
            <div className={styles.tokenSelectionDiv}>
              {selectedAsset === selectedAccount?.symbol && <SelectedAsset
                onSelectedAssetClick={toggle}
                label={selectedAccount?.symbol}
                icon={getSymbol(selectedAccount?.symbol)?.icon || ''}
                loading={currentBalance?.loading}
                showDropdown={assets?.length === 0 || assets?.length === undefined}
                balanceTxt={currentBalance === null
                  ? `Balance: `
                  : `Balance: ${currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals)} ${currentBalance?.currency?.symbol}`
                }
              />}
              {getSelectedAsset(selectedAsset) && <SelectedAsset
                onSelectedAssetClick={toggle}
                label={selectedAssetObj?.label}
                loading={false}
                balanceTxt={selectedAssetObj.balanceTxt}
                icon={selectedAssetObj.icon || getTokenInfo(selectedAsset).icon}
              />
              }
              {toggleAssetDropdown &&
                <div className={styles.assetOptions}>
                  <AssetOption
                    onAssetOptionClick={() => toggleAndSetAsset(selectedAccount?.symbol || '')}
                    label={selectedAccount?.symbol}
                    icon={getSymbol(selectedAccount?.symbol)?.icon || ''}
                    balanceTxt={currentBalance === null
                      ? `Balance: `
                      : `Balance: ${currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals)} ${currentBalance?.currency?.symbol}`
                    }
                  />
                  {assets?.map((asset: keyable, index: number) => <AssetOption
                    key={index}
                    onAssetOptionClick={() => toggleAndSetAsset(asset?.id || index)}
                    label={asset.label}
                    icon={asset.icon || getTokenInfo(asset?.id).icon}
                    balanceTxt={asset.balanceTxt}
                  />
                  )}
                </div>
              }
            </div>
          </div>
          {selectedAsset === selectedAccount?.symbol && <AmountInput
            initialValue={selectedAmount.toString()}
            address={address}
            fees={fees}
            amountCallback={setSelectedAmount}
            errorCallback={setError}
          />}
          {getSelectedAsset(selectedAsset) && getSelectedAsset(selectedAsset).type != 'nft' && <AmountInput
            initialValue={selectedAmount.toString()}
            address={address}
            fees={fees}
            tokenId={getSelectedAsset(selectedAsset)?.tokenId}
            amountCallback={setSelectedAmount}
            errorCallback={setError}
          />
          }
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
            : getSelectedAsset(selectedAsset)?.type == 'DIP20' ? <div className={styles.confirmAmountCont}>
              <img
                className={clsx(styles.tokenLogo, styles.tokenLogoConfirm)}
                src={getTokenInfo(selectedAsset)?.icon}
              />
              <div>
                <div className={styles.tokenText}>{getTokenInfo(selectedAsset)?.name}</div>
                <div className={styles.tokenAmount}>{selectedAmount.toFixed(5)} {getTokenInfo(selectedAsset)?.symbol}</div>
                <div className={styles.tokenValue}>${(selectedAmount * getSelectedAsset(selectedAsset)?.usd).toFixed(3)}</div>
              </div>
            </div> :
              <div className={styles.confirmAmountCont}>
                <img
                  className={clsx(styles.tokenLogo, styles.tokenLogoConfirm)}
                  src={getTokenImageURL(selectedAssetObj)}
                />
                <div>
                  <div className={styles.tokenText}>{selectedAssetObj?.tokenIndex}</div>
                  <div className={styles.tokenAmount}>1 NFT</div>
                </div>
              </div>
          }
          {getSelectedAsset(selectedAsset)?.type == 'DIP20' && <div className={styles.feeCont}>
            <div className={styles.feeRow}>
              <div className={styles.feeTitle}>Transaction Fee</div>
              <div>
                <div className={styles.feeAmount}>{fees} {getTokenInfo(selectedAsset)?.symbol}</div>
                <div className={styles.feeValue}>${(fees * getSelectedAsset(selectedAsset)?.usd).toFixed(3)}</div>
              </div>
            </div>

            <div className={styles.feeRow}>
              <div className={styles.feeTotal}>Total</div>
              <div>
                <div className={styles.feeAmount}>{(selectedAmount + fees).toFixed(getTokenInfo(selectedAsset)?.decimals)}</div>
                <div className={styles.feeValue}>${((selectedAmount + fees) * getSelectedAsset(selectedAsset)?.usd).toFixed(3)}</div>
              </div>
            </div>

          </div>}
          {selectedAsset === selectedAccount?.symbol && <div className={styles.feeCont}>
            <div className={styles.feeRow}>
              <div className={styles.feeTitle}>Transaction Fee</div>
              <div>
                <div className={styles.feeAmount}>{fees} {selectedAccount?.symbol}</div>
                <div className={styles.feeValue}>${(fees * currentUSDValue?.usd).toFixed(3)}</div>
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
          disabled={loadingSend || !selectedRecp || recpError !== '' || error !== ''}
          loading={isBusy}
          onClick={onConfirm}>
          {'Next'}
        </NextStepButton>

        : <NextStepButton
          disabled={loadingSend || !!error || pass.length < MIN_LENGTH || !(txCompleteTxt === undefined || txCompleteTxt === '')}
          loading={isBusy || loadingSend}
          onClick={() => selectedAccount?.symbol === 'ICP' ? transferAssetsForICP() : transferForAll()}>
          {'Send'}
        </NextStepButton>}
    </div>
  </></div>;
};


interface SelectedAssetProps {
  icon: string,
  label: string,
  loading: boolean,
  balanceTxt: string,
  showDropdown?: boolean,
  onSelectedAssetClick: () => void,
}

interface AssetOptionProps {
  icon: string,
  label: string,
  balanceTxt: string,
  onAssetOptionClick: () => void
}

const SelectedAsset = ({ icon, label, loading, balanceTxt, onSelectedAssetClick, showDropdown }: SelectedAssetProps) => <div
  onClick={showDropdown ? console.log : onSelectedAssetClick}
  className={clsx(styles.selectedNetworkDiv, showDropdown && styles.selectedNetworkDiv_noPointer)}>
  <img
    className={styles.tokenLogo}
    src={icon}
  />
  <div className={styles.tokenSelectionLabelDiv}>
    <div className={styles.tokenLabel}>{label}</div>
    <div className={styles.tokenBalance}>
      {loading
        ? <SkeletonTheme color="#222"
          highlightColor="#000">
          <Skeleton width={150} />
        </SkeletonTheme>
        : <span className={styles.tokenBalanceText}>{balanceTxt}</span>
      }
    </div>
  </div>
  {!showDropdown && <img className={styles.iconcaret} src={ICON_CARET} />}
</div>

const AssetOption = ({ icon, label, balanceTxt, onAssetOptionClick }: AssetOptionProps) => <div
  onClick={onAssetOptionClick}
  className={clsx(styles.selectedNetworkDiv, styles.selectedNetworkDivOption)}>
  <img
    className={styles.tokenLogo}
    src={icon}
  />
  <div className={styles.tokenSelectionLabelDiv}>
    <div className={styles.tokenLabel}>{label}</div>
    <div className={styles.tokenBalance}>
      <span className={styles.tokenBalanceText}>{balanceTxt}</span>
    </div>
  </div>
</div>



const AmountInput = ({ address, fees, initialValue, amountCallback, errorCallback, tokenId }: {
  address: string,
  fees: any,
  initialValue?: string,
  amountCallback: (amount: number) => void,
  errorCallback: (error: string) => void,
  tokenId?: string
}) => {
  const selectedAccount = useSelector(selectAccountById(address));

  const currentBalance: keyable = useSelector(selectBalanceByAddress(address));
  const currentUSDValue: keyable = useSelector(selectAssetBySymbol(getSymbol(selectedAccount?.symbol)?.coinGeckoId || ''));
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);
  const tokenInfo = useSelector(selectInfoBySymbolOrToken(tokenId || '', address));

  const price = tokenInfo?.type == "DIP20" ? tokenInfo?.usd : currentUSDValue?.usd;

  useEffect(() => {
    if (initialValue != undefined && initialValue != '0')
      changeAmount(initialValue);
  }, [(initialValue != '0' && initialValue != undefined), fees, tokenId]);


  useEffect(() => {
    amountCallback(selectedAmount);
  }, [amountCallback, selectedAmount]);

  useEffect(() => {
    errorCallback(error);
  }, [errorCallback, error]);

  const loadMaxAmount = useCallback((): void => {
    let maxAmount
    if (tokenInfo?.type == "DIP20") {
      maxAmount = tokenInfo.balance / Math.pow(10, tokenInfo.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));

    } else {
      maxAmount = currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));
    }
    changeAmount(maxAmount.toString());
  }, [currentBalance, fees]);

  const changeAmount = (amount: string) => {

    setInitialized(true);

    let maxAmount
    if (tokenInfo?.type == "DIP20") {
      maxAmount = tokenInfo.balance / Math.pow(10, tokenInfo.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));

    } else {
      maxAmount = currentBalance?.value / Math.pow(10, currentBalance?.currency?.decimals) - fees;
      maxAmount = parseFloat(maxAmount.toFixed(8));
    }

    const _amount = parseFloat(amount);

    if (isNaN(_amount)) {
      setSelectedAmount(_amount);
      setError(`Amount cannot be empty.`);
    }
    else if (_amount !== 0 && _amount <= maxAmount) {
      setSelectedAmount(_amount)
      setError('');
    }
    else if (_amount == 0) {
      if (fees == 0) {
        setSelectedAmount(_amount)
        setError(`Amount cannot be zero.`);
      } else {
        setSelectedAmount(_amount)
        setError(`Amount cannot be zero. Transaction fees is ${fees} ${selectedAccount?.symbol}`);
      }
    }
    else if (_amount > maxAmount) {
      setSelectedAmount(_amount);
      setError(`Insufficient balance.`);
    }

  }
  return <div>
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
      onChange={(e) => changeAmount(e.target.value)}
      placeholder="amount up to 8 decimal places"
      required
      step="0.001"
      type="number"
      value={selectedAmount}
    />
    {!(error != '') && initialized && <div
      className={styles.priceInput}
    >${((selectedAmount + fees) * price).toFixed(2)}</div>}
    {error != '' && (
      <div
        className={styles.amountError}
      >
        <Warning
          isBelowInput
          isDanger
        >
          {error}
        </Warning>
      </div>
    )}
  </div>

}
export default withRouter(WalletSendTokens);
