import { request } from 'undici'

import logger from './logger.js'
import { MIN_LIQUIDITY } from './env.js'

const log = logger(import.meta)

export const dexs = {
  ABEX: '0x3c6595e543c4766dd63b5b2fa918516bac2920bc1944da068be031dced46a18d',
  AFTERMATH:
    '0xefe170ec0be4d762196bedecd7a065816576198a6527c99282a2551aaa7da38c',
  BAYSWAP: '0x72b55bab9064f458451ccf0157e2e0317bcd9b210476b9954081c44ee07b7702',
  BLUEMOVE:
    '0x3f2d9f724f4a1ce5e71676448dc452be9a6243dac9c5b975a588c8c867066e92',
  CETUS: '0x4c9ab808d50ca1358cc699bb53b6334b9471d4718fb19bb621ff41c2e93bbce4',
  FLOWX: '0xd15e209f5a250d6055c264975fee57ec09bf9d6acdda3b5f866f76023d1563e6',
  INTEREST_PROTOCOL:
    '0x108779144605a44e4b5447118b711f0b17adf6168cc9b08551d33daca58098e3',
  KRIYA: '0xa0eba10b173538c8fecca1dff298e488402cc9ff374f8a12ca7758eebe830b66',
  SUISWAP: '0x361dd589b98e8fcda9a7ee53b85efabef3569d00416640d2faa516e3801d7ffc',
  TURBOS: '0x08984ed8705f44b6403705dc248896e56ab7961447820ae29be935ce0d32198b',
}

async function get_dexs() {
  const { body } = await request(
    'https://suiscan.xyz/api/sui-backend/mainnet/api/directories/dex-pool-projects',
    {
      headers: {
        cookie:
          'accDetailsView=list; projectCardView=bigTiles; accDomainsView=list; cf_clearance=Ts4qCCiMY7j1qBHydUUcwD6StJKmV6Q2B72t9RDBfb4-1710326891-1.0.1.1-uiLGxa1wuhJi3vs5xanEjJqqgPnC7mf23iJBIYKZFqp2Qw44J1ntq0Iob3VUI_qtWl2F5hw3yjYcdxVpTT8rnA; version30Packages=true; version30Apps=false; version30Coins=false; version30Analytics=false',
      },
      method: 'GET',
    },
  )

  return body.json()
}

function parse_pool({ poolId, liquidityInUsd, coins }) {
  const [coin0, coin1] = coins

  if (!coin0 || !coin1 || liquidityInUsd < MIN_LIQUIDITY) return null
  if (coin0.symbol !== 'SUI' && coin1.symbol !== 'SUI') return null

  return {
    id: poolId,
    liquidity: liquidityInUsd,
    coin_a: {
      type: coin0?.coinType,
      symbol: coin0.symbol,
    },
    coin_b: {
      type: coin1?.coinType,
      symbol: coin1.symbol,
    },
  }
}

export async function get_pools(poolFactoryId) {
  const { body } = await request(
    'https://suiscan.xyz/api/sui-backend/mainnet/api/dex/pools?page=0&sortBy=LIQUIDITY_IN_USD&orderBy=DESC&size=100&period=DAY',
    {
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        poolFactoryId: [poolFactoryId],
      }),
      method: 'POST',
      cookie:
        'accDetailsView=list; projectCardView=bigTiles; accDomainsView=list; cf_clearance=Ts4qCCiMY7j1qBHydUUcwD6StJKmV6Q2B72t9RDBfb4-1710326891-1.0.1.1-uiLGxa1wuhJi3vs5xanEjJqqgPnC7mf23iJBIYKZFqp2Qw44J1ntq0Iob3VUI_qtWl2F5hw3yjYcdxVpTT8rnA; version30Packages=true; version30Apps=false; version30Coins=false; version30Analytics=false',
    },
  )

  const { content } = await body.json()
  return content.map(parse_pool).filter(Boolean)
}

log.info({}, 'fetching dexs')

const found = await get_dexs()

log.info({ dexs: found.length }, 'found')

if (found.length !== Object.keys(dexs).length) {
  log.warn('!! new unknown dex detected')
}

// console.dir(await get_pools(dexs.CETUS), { depth: Infinity })
