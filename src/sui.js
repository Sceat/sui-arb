import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'

import logger from './logger.js'

const log = logger(import.meta)
const client = new SuiClient({ url: getFullnodeUrl('mainnet') })

export async function get_pool(id) {
  log.info({ id }, 'get pool')

  const result = await client.getObject({
    id,
    options: {
      showContent: true,
    },
  })

  return result
}

export async function get_decimals(type) {
  const result = await client.getCoinMetadata({ coinType: type })
  return result.decimals
}
