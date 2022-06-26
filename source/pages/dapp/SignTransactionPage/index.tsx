import React, { useState, useCallback, useEffect, Fragment } from 'react';
import styles from './index.module.scss';
import {
  useCurrentDapp,
  useCurrentDappAddress,
  useEthSignApprove,
  useSignApprove,
} from '~hooks/useController';
import ActionButton from '~components/composed/ActionButton';
import { useController } from '~hooks/useController';
import { decryptString } from '~utils/vault';
import { selectAccountById } from '~state/wallet';
import { useSelector } from 'react-redux';
import { getSymbol, isJsonString } from '~utils/common';
import { validateMnemonic } from '@earthwallet/keyring';
import InputWithLabel from '~components/InputWithLabel';
import Warning from '~components/Warning';
import { safeParseJSON, stringifyWithBigInt } from '~global/helpers';
import { ClipLoader } from 'react-spinners';
//import { keyable } from '~scripts/Background/types/IMainController';
import { selectRequestStatusById } from '~state/dapp';
import clsx from 'clsx';
import { getShortAddress } from '~utils/common';
import { ethers } from 'ethers';
import {
  personalSign,
  signTypedData,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
// import ICON_ICP from '~assets/images/icon_icp_details.png';

const MIN_LENGTH = 6;

const SignTransactionPage = () => {
  const dapp = useCurrentDapp();
  const requestId = window.location.hash?.substring(1);
  const requestStatus = useSelector(selectRequestStatusById(requestId));
  const activeAccountAddress = useCurrentDappAddress();

  const controller = useController();
  const request = controller.dapp.getSignatureRequest();
  const selectedAccount = useSelector(selectAccountById(activeAccountAddress));
  const approveSign = useSignApprove();
  const approveEthSign = useEthSignApprove();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [pass, setPass] = useState('');
  const signatureType = controller.dapp.getSignatureType();

  console.log(request);
  const onPassChange = useCallback(
    (password: string) => {
      setPass(password);
      setError('');

      let secret = '';
      try {
        secret =
          selectedAccount?.symbol !== 'ICP'
            ? decryptString(selectedAccount?.vault.encryptedMnemonic, password)
            : decryptString(selectedAccount?.vault.encryptedJson, password);
      } catch (error) {
        setError('Wrong password! Please try again');
      }
      if (
        selectedAccount?.symbol === 'ICP'
          ? !isJsonString(secret)
          : !validateMnemonic(secret)
      ) {
        setError('Wrong password! Please try again');
      } else {
        setError('NO_ERROR');
      }
    },
    [selectedAccount]
  );

  const handleCancel = () => {
    window.close();
  };

  const hadleEthSign = async () => {
    setIsBusy(true);

    const mnemonic = decryptString(
      selectedAccount?.vault.encryptedMnemonic,
      pass
    );

    let version = SignTypedDataVersion.V1;
    switch (signatureType) {
      case 'eth_signTypedData_v3':
        version = SignTypedDataVersion.V3;
        break;
      case 'eth_signTypedData_v4':
        version = SignTypedDataVersion.V4;
        break;
      default:
    }

    const provider = new ethers.providers.JsonRpcProvider(
      'https://eth-mainnet.g.alchemy.com/v2/WQY8CJqsPNCqhjPqPfnPApgc_hXpnzGc'
    );
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    if (signatureType !== 'personal_sign') {
      const encryptedHash = signTypedData({
        privateKey: Buffer.from(signer.privateKey.substring(2), 'hex'),
        data:
          signatureType === 'eth_signTypedData'
            ? (request as any)
            : JSON.parse(request as any),
        version,
      });
      controller.dapp.setApprovedIdentityJSON(encryptedHash);
    } else {
      const encryptedHash = personalSign({
        privateKey: Buffer.from(signer.privateKey.substring(2), 'hex'),
        data: request as any,
      });
      controller.dapp.setApprovedIdentityJSON(encryptedHash);
    }

    await approveEthSign();

    setIsBusy(false);
  };

  const handleSign = async () => {
    setIsBusy(true);

    let secret = '';

    try {
      secret = decryptString(selectedAccount?.vault.encryptedJson, pass);
    } catch (error) {
      setError('Wrong password! Please try again');
      setIsBusy(false);
    }

    if (isJsonString(secret)) {
      controller.dapp.setApprovedIdentityJSON(secret);
      await approveSign();
    }
    setIsBusy(false);
  };

  useEffect(() => {
    if (requestStatus?.complete) {
      const body = document.querySelector('#response');

      body?.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [requestStatus?.complete]);

  return (
    <div
      className={clsx(
        styles.page,
        !(requestStatus?.loading || requestStatus?.complete) &&
          styles.page_extra
      )}
    >
      <div id={'response'} className={styles.title}>
        {request?.type === 'createSession'
          ? 'Create Session'
          : 'Signature Request'}
      </div>
      {requestStatus?.response && (
        <div
          className={clsx(
            styles.accountInfo,
            styles.response,
            safeParseJSON(requestStatus?.response)?.type == 'error' &&
              styles.errorResponse
          )}
        >
          <div className={styles.label}>Response</div>
          <div className={clsx(styles.value, styles.valueMono)}>
            {typeof requestStatus?.response === 'string'
              ? requestStatus?.response
              : stringifyWithBigInt(requestStatus?.response)}
          </div>
        </div>
      )}
      <div className={styles.accountInfo}>
        <div className={styles.accountInfoKey}>Origin</div>
        <div className={styles.accountInfoValCont}>
          <div className={styles.accountInfoIcon}>
            <img src={dapp?.logo} className={styles.accountInfoIcon24} />
          </div>
          <div className={styles.accountInfoVal}>{dapp?.origin}</div>
        </div>

        <div className={styles.accountInfoKey}>Account</div>
        <div className={styles.accountInfoValCont}>
          <div className={styles.accountInfoIcon}>
            <img
              src={getSymbol(selectedAccount.symbol)?.icon}
              className={styles.accountInfoIcon24}
            />
          </div>
          <div className={styles.accountInfoVal}>
            {activeAccountAddress && getShortAddress(activeAccountAddress)}
          </div>
        </div>
      </div>

      {request?.type === 'createSession' ? (
        <div className={styles.requestBody}>
          <div className={styles.label}>Session Id</div>
          <div className={styles.value}>{request?.sessionId}</div>
          <div className={styles.label}>CanisterIds</div>
          <div className={styles.value}>
            {request?.canisterIds?.length > 0 &&
              request?.canisterIds.map((canisterId: string) => (
                <div className={styles.canisterid} key={canisterId}>
                  {canisterId}
                </div>
              ))}
          </div>
          <div className={styles.label}>Expiry Time</div>
          <div className={styles.value}>{request?.expiryTime}</div>
        </div>
      ) : request?.type === 'signRaw' ? (
        <div className={styles.requestBody}>
          <div className={styles.label}>Sign Raw Message</div>
          <div className={styles.value}>{request?.message}</div>
        </div>
      ) : Array.isArray(request) ? (
        request[0].casterId ? (
          request.map((singleReq, index) => (
            <div key={index} className={styles.requestBody}>
              <div className={styles.label}>CanisterId</div>
              <div className={styles.value}>{singleReq?.canisterId}</div>
              <div className={styles.label}>Method</div>
              <div className={clsx(styles.value, styles.valueMono)}>
                {singleReq?.method}
              </div>
              <div className={styles.label}>Message</div>
              <div className={clsx(styles.value, styles.valueMono)}>
                {singleReq?.args === undefined
                  ? 'undefined'
                  : stringifyWithBigInt(singleReq?.args)?.length > 1000
                  ? stringifyWithBigInt(singleReq?.args)?.substring(0, 1000) +
                    '...'
                  : stringifyWithBigInt(singleReq?.args)}
              </div>
            </div>
          ))
        ) : (
          request.map((singleReq, index) => (
            <div key={index} className={styles.requestBody}>
              {Object.keys(singleReq).map((reqKey: string) => (
                <Fragment key={reqKey}>
                  <div className={styles.label}>{reqKey}</div>
                  <div className={styles.value}>{singleReq[reqKey]}</div>
                </Fragment>
              ))}
            </div>
          ))
        )
      ) : signatureType === 'eth_signTypedData_v3' ||
        signatureType === 'eth_signTypedData_v4' ||
        signatureType === 'personal_sign' ? (
        <div className={styles.requestBody}>
          <div className={styles.label}>Sign Data</div>
          <div className={styles.value}>{request}</div>
        </div>
      ) : (
        <div className={styles.requestBody}>
          <div className={styles.label}>CanisterId</div>
          <div className={styles.value}>{request?.canisterId}</div>
          <div className={styles.label}>Method</div>
          <div className={clsx(styles.value, styles.valueMono)}>
            {request?.method}
          </div>
          <div className={styles.label}>Message</div>
          <div className={clsx(styles.value, styles.valueMono)}>
            {request?.args === undefined
              ? 'undefined'
              : stringifyWithBigInt(request?.args)?.length > 1000
              ? stringifyWithBigInt(request?.args)?.substring(0, 1000) + '...'
              : stringifyWithBigInt(request?.args)}
          </div>
        </div>
      )}

      {requestStatus?.loading ? (
        <section className={styles.footerSuccess}>
          <ClipLoader color={'#fffff'} size={15} />
        </section>
      ) : requestStatus?.complete ? (
        <section className={styles.footerSuccess}>
          <ActionButton onClick={() => window.close()}>
            &nbsp;&nbsp;&nbsp;Transaction Complete!&nbsp;&nbsp;&nbsp;
          </ActionButton>
        </section>
      ) : (
        <section className={styles.footer}>
          <InputWithLabel
            data-export-password
            disabled={isBusy}
            isError={pass.length < MIN_LENGTH || !!error}
            label={'password for this account'}
            onChange={onPassChange}
            placeholder="REQUIRED"
            type="password"
          />
          {false && error && error != 'NO_ERROR' && (
            <Warning isBelowInput isDanger>
              {error}
            </Warning>
          )}
          <div className={styles.actions}>
            <ActionButton actionType="secondary" onClick={handleCancel}>
              Cancel
            </ActionButton>
            <ActionButton
              disabled={error != 'NO_ERROR'}
              onClick={
                selectedAccount.symbol === 'ICP' ? handleSign : hadleEthSign
              }
            >
              Approve
            </ActionButton>
          </div>
        </section>
      )}
    </div>
  );
};

export default SignTransactionPage;
