import parse from './parser.js'
import { get_pool } from './sui.js'
import { dexs, get_pools } from './suiscan.js'
import logger from './logger.js'
import { search_opportunity } from './mev.js'

const log = logger(import.meta)

// dex name -> pools
const known_dexs = new Map()

// pool id -> parsed pool data
const known_pools = new Map()

// token type -> set of parsed pool data
const known_tokens = new Map()

async function get(dex) {
  if (!known_dexs.has(dex)) {
    const pools = await get_pools(dexs[dex])
    known_dexs.set(dex, pools)
  }

  const pools = known_dexs.get(dex)

  return Promise.all(
    pools.map(async pool => {
      if (known_pools.has(pool.id)) return known_pools.get(pool.id)
      const pool_data = await get_pool(pool.id)
      const parsed = await parse(dex, pool_data)
      known_pools.set(pool.id, { dex, ...parsed })
      return parsed
    }),
  )
}

function register_token(token_type) {
  if (!known_tokens.has(token_type)) known_tokens.set(token_type, new Set())

  const pools_for_token = known_tokens.get(token_type)

  const pools = [...known_pools.values()]
  pools
    .filter(pool => pool.type === token_type)
    .forEach(pool => pools_for_token.add(pool))
}

function register_tokens() {
  known_pools.forEach(pool => {
    if (!known_tokens.has(pool.type)) register_token(pool.type)
  })
}

await get('TURBOS')
await get('FLOWX')
await get('BLUEMOVE')

register_tokens()

known_tokens.forEach(pools => {
  search_opportunity(pools)
})

// console.dir(await get_pools(dexs.FLOWX), { depth: Infinity })

// console.dir(
//   await parse(
//     'TURBOS',
//     await get_pool(
//       '0xcceec256e8fc42d1a54536da9b032d2b0ae5f07a04902c1e6db70be354f8b640',
//     ),
//   ),
//   { depth: Infinity },
// )
// console.dir(
//   await parse(
//     'FLOWX',
//     await get_pool(
//       '0x36022129ed970966c0245159824d4cb6870e13de7a61d063a092ac493697ab8d',
//     ),
//   ),
//   { depth: Infinity },
// )
// console.dir(
//   await parse(
//     'BLUEMOVE',
//     await get_pool(
//       '0x74ac1a879108525d2c86b7341d69c7e11f5cb90994942af99a4f5a35a3179068',
//     ),
//   ),
//   { depth: Infinity },
// )

log.info({ known_pools: known_pools.size }, 'pools initialized')
