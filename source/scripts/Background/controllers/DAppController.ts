import { ConnectedDApps, DAppInfo } from '~global/types';
import { listNewDapp, unlistDapp, updateDapp } from '~state/dapp';
import store from '~state/store';
import { IDAppController } from '../types/IDAppController';
import { removeEntityKey, storeEntities } from '~state/entities';
import { keyable } from '../types/IAssetsController';
import { stringifyWithBigInt } from '~global/helpers';

class DAppController implements IDAppController {
  #current: DAppInfo = { origin: '', logo: '', title: '', address: '' };
  #request: keyable;
  #requestType: string | null;
  #approvedIdentityJSON: string;

  fromPageConnectDApp(origin: string, title: string) {
    const dapp: ConnectedDApps = store.getState().dapp;

    this.#current = {
      origin,
      logo: `chrome://favicon/size/64@1x/${origin}`,
      title,
    };

    return !!dapp[origin];
  }

  isPageOriginAllowed(origin: string) {
    const dapp: ConnectedDApps = store.getState().dapp;
    return !!dapp[origin];
  }

  fromUserConnectDApp(origin: string, dapp: DAppInfo) {
    store.dispatch(listNewDapp({ id: origin, dapp }));
  }

  addSignRequest(request: any, id: string) {
    if (request.type === 'createSession') {
      const { sessionId, ...requestData } = request;

      store.dispatch(
        storeEntities({
          entity: 'dappRequests',
          data: [
            {
              id,
              origin: this.#current.origin,
              type: 'createSession',
              request: requestData,
              address: this.getCurrentDappAddress(),
            },
          ],
        })
      );
    } else if (request.type === 'signRaw') {
      store.dispatch(
        storeEntities({
          entity: 'dappRequests',
          data: [
            {
              id,
              origin: this.#current.origin,
              type: 'signRaw',
              request: request,
              address: this.getCurrentDappAddress(),
            },
          ],
        })
      );
    } else {
      const parsedRequest = Array.isArray(request)
        ? request.map((singleReq, _) => ({
            ...singleReq,
            truncatedArgs: stringifyWithBigInt(singleReq?.args)?.length > 1000,
            args: stringifyWithBigInt(singleReq?.args)?.substring(0, 1000),
          }))
        : {
            ...request,
            truncatedArgs: stringifyWithBigInt(request?.args)?.length > 1000,
            args: stringifyWithBigInt(request?.args)?.substring(0, 1000),
          };

      store.dispatch(
        storeEntities({
          entity: 'dappRequests',
          data: [
            {
              id,
              origin: this.#current.origin,
              type: 'sign',
              ethSignType: this.#requestType,
              request: parsedRequest,
              data: this.#requestType ? request : undefined,
              address: this.getCurrentDappAddress(),
            },
          ],
        })
      );
    }
  }

  setDappConnectedAddress(address: string, origin: string) {
    const dapp: ConnectedDApps = store.getState().dapp;
    if (origin !== undefined) {
      store.dispatch(
        updateDapp({
          id: origin,
          dapp: { ...dapp[origin], address: address },
        })
      );
    }
  }

  getCurrent() {
    return this.#current;
  }

  getCurrentDappAddress() {
    const dapp: ConnectedDApps = store.getState().dapp;
    return dapp[this.#current.origin].address || '';
  }

  setSignatureRequest(req: keyable, requestId: string) {
    this.#request = req;
    this.addSignRequest(req, requestId);
  }

  setSignatureType(reqType: string | null) {
    this.#requestType = reqType;
  }

  getSignatureType() {
    return this.#requestType;
  }

  getSignatureRequest = () => {
    return this.#request;
  };

  setApprovedIdentityJSON(identityJSON: string) {
    this.#approvedIdentityJSON = identityJSON;
  }

  getApprovedIdentityJSON = () => {
    return this.#approvedIdentityJSON;
  };

  deleteOriginAndRequests = (origin: string, call?: () => void | undefined) => {
    call && call();

    store.dispatch(unlistDapp({ id: origin }));

    const dappRequests = store.getState().entities?.dappRequests?.byId;

    return (
      dappRequests &&
      Object.keys(dappRequests)
        .map((id) => dappRequests[id])
        .filter((dappRequest) => dappRequest.origin === origin)
        .map((dappRequest) =>
          store.dispatch(
            removeEntityKey({ entity: 'dappRequests', key: dappRequest.id })
          )
        )
    );
  };
}

export default DAppController;
