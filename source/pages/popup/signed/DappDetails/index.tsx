import React, { useCallback } from 'react';
import styles from './index.scss';
import ICON_DELETE from '~assets/images/icon_delete.svg';

//import Loading from '~components/Loading';
import Header from '~components/Header';
import clsx from 'clsx';
import { useSelector } from 'react-redux';
import { selectDapp, selectDappRequests } from '~state/dapp';
import { getShortAddress } from '~utils/common';

import { RouteComponentProps, withRouter } from 'react-router';
import { keyable } from '~scripts/Background/types/IAssetsController';
import { safeParseJSON, stringifyWithBigInt } from '~global/helpers';
import moment from 'moment-mini';
import useToast from '~hooks/useToast';
import { useHistory } from 'react-router-dom';
import { useController } from '~hooks/useController';
import ICON_TX_ERROR from '~assets/images/icon_tx_error.svg';

interface Props extends RouteComponentProps<{ origin: string }> {}

const DappDetails = ({
  match: {
    params: { origin },
  },
}: Props) => {
  const parsedOrigin = decodeURIComponent(origin);
  const dapp = useSelector(selectDapp(parsedOrigin));
  const dappRequests = useSelector(selectDappRequests(parsedOrigin));
  const { show } = useToast();
  const controller = useController();

  const reset = useCallback((): void => show('Dapp Disconnected'), [show]);

  const history = useHistory();

  const disconnectOrigin = () => {
    const call = () => history.goBack();
    reset();
    controller.dapp.deleteOriginAndRequests(parsedOrigin, call);
  };
  return (
    <div className={styles.page}>
      <Header
        type={'wallet'}
        text={
          dapp?.title?.length < 27
            ? dapp?.title
            : dapp?.title?.substring(0, 27) + '...'
        }
      >
        <div className={styles.empty} />
      </Header>
      <div className={styles.container}>
        <div className={clsx(styles.earthInputCont, styles.mnemonicInputCont)}>
          <div key={dapp.origin} className={styles.checkboxCont}>
            <div className={styles.checkboxContent}>
              <img src={dapp?.logo} className={styles.networkIcon} />
              <div>
                <div className={styles.row}>
                  <div className={styles.checkboxTitle}>Dapp Origin</div>
                  <div className={styles.checkboxSubTitle}>{dapp?.origin}</div>
                </div>
                <div className={styles.row}>
                  <div className={styles.checkboxTitle}>Connected Address</div>
                  <div className={styles.checkboxSubTitle}>
                    {dapp?.address && getShortAddress(dapp?.address)}
                  </div>
                </div>
              </div>
            </div>
            <img
              onClick={() => disconnectOrigin()}
              className={styles.deleteIcon}
              src={ICON_DELETE}
            />
          </div>
        </div>

        <div className={styles.earthInputCont}>
          <div className={styles.labelText}>
            Dapp Requests - {dappRequests?.length}
          </div>
          <div>
            {dappRequests?.length > 0 &&
              dappRequests
                ?.sort(
                  (a: keyable, b: keyable) =>
                    (b.completedAt || 0) - (a.completedAt || 0)
                )
                .map((dappRequest: keyable) => (
                  <div key={dappRequest.id} className={styles.requestContainer}>
                    <div className={styles.label}>Request Id</div>
                    <div className={styles.value}>{dappRequest.id}</div>
                    <div className={styles.label}>Completed on</div>
                    <div className={styles.value}>
                      {dappRequest.completedAt &&
                        moment(dappRequest.completedAt).format(
                          'MMMM Do YYYY, h:mm:ss a'
                        )}
                    </div>

                    <div className={styles.label}>Batch Request</div>
                    <div className={styles.value}>
                      {Array.isArray(dappRequest.request) ? 'True' : 'False'}
                    </div>
                    <div className={styles.label}>
                      Response
                      {safeParseJSON(dappRequest?.response)?.type ==
                        'error' && (
                        <img className={styles.errorIcon} src={ICON_TX_ERROR} />
                      )}
                    </div>
                    <div className={styles.value}>{dappRequest.response}</div>
                    {dappRequest?.request?.type !== 'signRaw' &&
                    dappRequest?.request?.ethSignType === null ? (
                      <>
                        {Array.isArray(dappRequest.request) ? (
                          dappRequest.request.map((singleReq, index) => (
                            <div key={index} className={styles.requestBody}>
                              <div className={styles.label}>CanisterId</div>
                              <div className={styles.value}>
                                {singleReq?.canisterId}
                              </div>
                              <div className={styles.label}>Method</div>
                              <div className={styles.value}>
                                {singleReq?.method}
                              </div>
                              <div className={styles.label}>Message</div>
                              <div className={styles.value}>
                                {stringifyWithBigInt(singleReq?.args) || '-'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.requestBody}>
                            <div className={styles.label}>CanisterId</div>
                            <div className={styles.value}>
                              {dappRequest.request?.canisterId}
                            </div>
                            <div className={styles.label}>Method</div>
                            <div className={styles.value}>
                              {dappRequest.request?.method}
                            </div>
                            <div className={styles.label}>Message</div>
                            <div className={styles.value}>
                              {stringifyWithBigInt(dappRequest.request?.args) ||
                                '-'}
                            </div>
                          </div>
                        )}
                      </>
                    ) : dappRequest?.ethSignType !== null ? (
                      <>
                        <div className={styles.requestBody}>
                          <div className={styles.label}>Request Type</div>
                          <div className={styles.value}>
                            {dappRequest?.ethSignType}
                          </div>
                          <div className={styles.label}>Request Data</div>
                          <div className={styles.value}>
                            {typeof dappRequest?.data === 'string'
                              ? dappRequest?.data
                              : JSON.stringify(dappRequest?.data)}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.requestBody}>
                          <div className={styles.label}>
                            signRaw Request Message
                          </div>
                          <div className={styles.value}>
                            {dappRequest.request?.message}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(DappDetails);
