const providerManager = () => `
class InjectedProvider {
  constructor (asset) {
    this.asset = asset
  }

  setClient () {}

  getMethod (method) {
    return (...args) => window.providerManager.proxy('CAL_REQUEST', {
      asset: this.asset,
      method,
      args
    })
  }
}

class ProviderManager {
  constructor () {
    this.cache = {}
  }

  proxy (type, data) {
    return new Promise((resolve, reject) => {
      const id = Date.now() + '.' + Math.random()
  
      window.addEventListener(id, ({ detail }) => {
        const response = JSON.parse(detail)
        if (response.error) reject(new Error(response.error))
        else resolve(response.result)
      }, {
        once: true,
        passive: true
      })
  
      window.postMessage({
        id,
        type,
        data
      }, '*')
    })
  }

  getProviderFor (asset) {
    if (this.cache[asset]) return this.cache[asset]

    this.cache[asset] = new InjectedProvider(asset)

    return this.cache[asset]
  }

  connect (asset) {
    return this.proxy('CONNECT_REQUEST', { asset })
  }
}

window.providerManager = new ProviderManager()
`;

// @ts-ignore
const ethereumProvider = ({
  name,
  asset,
  network,
  overrideEthereum = false,
}: {
  name: any;
  asset: any;
  network: any;
  overrideEthereum: boolean;
}) => `
async function getAddresses () {
  const eth = window.providerManager.getProviderFor('${asset}')
  const data = await eth.getMethod('wallet.getActiveAddress')()
  return [data]
}

async function handleRequest (req) {
  const eth = window.providerManager.getProviderFor('${asset}')
  
  if(req.method === 'eth_requestAccounts') {
    return await window.${name}.enable()
  }

  if(req.method === 'wallet_requestPermissions') {
    return Promise.resolve(req.params)
  }

  if(req.method === 'personal_sign') { 
    const sig = await eth.getMethod('wallet.signMessage')(req.params[0], req.params[1])
    return sig
  }

  if (req.method === 'personal_ecRecover') {
    const sig = await eth.getMethod('wallet.ecRecover')(req.params[0], req.params[1])
    return sig;
  }

  if(req.method === 'eth_signTypedData' ||
    req.method === 'eth_signTypedData_v3' ||
    req.method === 'eth_signTypedData_v4') {
    const sig = await eth.getMethod('wallet.signTypedData')(req)
    return sig;
  }

  if(req.method === 'eth_sendTransaction') {
    const result = await eth.getMethod('wallet.sendTransaction')(req.params[0])
    return '0x' + result.hash
  }

  if(req.method === 'eth_accounts') {
    return getAddresses()
  }
  return eth.getMethod('eth_jsonrpc')(req.method, req.params)
}

window.${name} = {
  isMetaMask: true,
  isEarth: true,
  isEIP1193: true,
  networkVersion: '${network.networkId}',
  chainId: '0x${network.chainId.toString(16)}',
  enable: async () => {
    const accepted = await window.providerManager.connect("${name}")
    if (!accepted) throw new Error('User rejected')
    return getAddresses()
  },
  request: async (req) => {
    const params = req.params || []
    return handleRequest({
      method: req.method, params
    })
  },
  send: async (req, _paramsOrCallback) => {
    if (typeof _paramsOrCallback === 'function') {
      window.${name}.sendAsync(req, _paramsOrCallback)
      return
    }
    const method = typeof req === 'string' ? req : req.method
    const params = req.params || _paramsOrCallback || []
    return handleRequest({ method, params })
  },
  sendAsync: (req, callback) => {
    handleRequest(req)
      .then((result) => callback(null, {
        id: req.id,
        jsonrpc: '2.0',
        result
      }))
      .catch((err) => callback(err))
  },
  on: (method, callback) => {}, // TODO
  autoRefreshOnNetworkChange: false
}

${
  overrideEthereum
    ? `function override() {
    window.ethereum = window.${name}
  }

  if (!window.ethereum) {
    override()
    const retryLimit = 5
    let retries = 0
    const interval = setInterval(() => {
      retries++
      if (window.ethereum && !window.ethereum.isLiquality) {
        override()
        clearInterval(interval)
      }
      if (retries >= retryLimit) clearInterval(interval)
    }, 1000)
  } else {
    override()
  }`
    : ''
}
`;
const earthProvider = () => `

const REQUEST_MAP = {
  isConnected: 'wallet.isConnected',
}

async function handleRequest (req) {
  const icp = window.providerManager.getProviderFor('ICP')
  if (req.method === 'wallet_sendTransaction') {
    const to = req.params[0].to
    const value = req.params[0].value.toString(16)
    return icp.getMethod('wallet.sendTransaction')({ to, value })
  }
  const method = REQUEST_MAP[req.method] || req.method
  console.log(method, ...req.params);
  return icp.getMethod(method)(...req.params)
}

window.earth = {
  evtRegMap: {},
  version: '6.1',
  isConnected: async () => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.isConnected')()
  },
  getAddressMeta: async () => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.getAddressMeta')()
  },
  createSession: async ({sessionId, canisterIds, expiryTime}) => {
    //check if already session is active
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.createSession')({sessionId, canisterIds, expiryTime})
  },
  updateSession: async ({canisterIds}) => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.updateSession')({ canisterIds })
  },
  sign: async (params) => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.sign')(params)
  },
  signRaw: async (params) => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.signRaw')(params)
  },
  sessionSign: async (params) => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.sessionSign')(params)
  },
  generateSessionId: async () => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.generateSessionId')()
  },
  isSessionActive: async (params) => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.isSessionActive')(params)
  },
  closeSession: async () => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.closeSession')()
  },
  connect: async (params) => {
    const accepted = await window.providerManager.connect('ICP')
    if (!accepted) throw new Error('User rejected')
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.getAddress')(params)
  },
  disconnect: async () => {
    const icp = window.providerManager.getProviderFor('ICP')
    return icp.getMethod('wallet.disconnect')()
  },
  request: async (req) => {
    const params = req.params || []
    return handleRequest({
      method: req.method, params
    })
  },
  on: (method, callback) => {
    const id = Date.now() + '.' + Math.random();
    
    window.earth.evtRegMap[id] = callback;

    window.addEventListener(id, ({detail}) => {
      const rCallback = window.earth.evtRegMap[id];
      if (rCallback) {
        rCallback(JSON.parse(detail));
      }
    })

    window.postMessage({ id, type: 'EARTH_EVENT_MESSAGE', data: { method } }, '*')
  }
}
`;

export { providerManager, earthProvider, ethereumProvider };
