// Copyright 2021 @earthwallet/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Injected } from '@earthwallet/sdk/build/main/inject/types';
import type { SendRequest } from './types';

import Accounts from './Accounts';
import PostMessageProvider from './PostMessageProvider';
import Signer from './Signer';

export default class implements Injected {
  public readonly accounts: Accounts;

  public readonly provider: PostMessageProvider;

  public readonly signer: Signer;

  constructor (sendRequest: SendRequest) {
    this.accounts = new Accounts(sendRequest);
    this.provider = new PostMessageProvider(sendRequest);
    this.signer = new Signer(sendRequest);
  }
}
