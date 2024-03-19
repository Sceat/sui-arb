import { TurbosSdk, Network } from 'turbos-clmm-sdk'
import BigNumber from 'bignumber.js'

import { get_decimals } from './sui.js'
import logger from './logger.js'

const log = logger(import.meta)
const turbo_sdk = new TurbosSdk(Network.mainnet)
const SUI = '0x2::sui::SUI'

const format_pool = ({
  type_a,
  balance_a,
  type_b,
  balance_b,
  price_a_b,
  price_b_a,
  swap_a_b = () => {},
  swap_b_a = () => {},
}) => {
  if (type_a === SUI) {
    return {
      type: type_b,
      sui_balance: balance_a.toString(),
      token_balance: balance_b.toString(),
      price: price_b_a.toString(),
      buy: swap_b_a,
      sell: swap_a_b,
    }
  }

  return {
    type: type_a,
    sui_balance: balance_b.toString(),
    token_balance: balance_a.toString(),
    price: price_a_b.toString(),
    buy: swap_a_b,
    sell: swap_b_a,
  }
}

async function parse_turbos_pool({
  data: {
    content: {
      type,
      fields: { coin_a, coin_b, sqrt_price },
    },
  },
}) {
  const [type_a_raw, type_b] = type.match(/0x[^\s,>]+::[^\s,>]+::[^\s,>]+/g)
  const type_a = type_a_raw.substring(type_a_raw.lastIndexOf('<') + 1)

  const decimals_a = await get_decimals(type_a)
  const decimals_b = await get_decimals(type_b)

  const balance_a = new BigNumber(coin_a).div(10 ** decimals_a)
  const balance_b = new BigNumber(coin_b).div(10 ** decimals_b)

  const price_a_b = turbo_sdk.math.sqrtPriceX64ToPrice(
    sqrt_price.toString(),
    decimals_a,
    decimals_b,
  )

  const price_b_a = price_a_b.pow(-1)

  return format_pool({
    type_a,
    balance_a,
    type_b,
    balance_b,
    price_a_b,
    price_b_a,
  })
}

async function parse_flowx_pool({
  data: {
    content: {
      fields: {
        value: {
          fields: { reserve_x, reserve_y },
        },
      },
    },
  },
}) {
  const type_a = reserve_x.type.substring(
    '0x2::coin::Coin<'.length,
    reserve_x.type.length - 1,
  )
  const type_b = reserve_y.type.substring(
    '0x2::coin::Coin<'.length,
    reserve_y.type.length - 1,
  )

  const decimals_a = await get_decimals(type_a)
  const decimals_b = await get_decimals(type_b)

  const balance_a = new BigNumber(reserve_x.fields.balance).div(
    10 ** decimals_a,
  )
  const balance_b = new BigNumber(reserve_y.fields.balance).div(
    10 ** decimals_b,
  )

  const price_a_b = balance_b.div(balance_a)
  const price_b_a = balance_a.div(balance_b)

  return format_pool({
    type_a,
    balance_a,
    type_b,
    balance_b,
    price_a_b,
    price_b_a,
  })
}

async function parse_bluemove({
  data: {
    objectId,
    content: {
      type,
      fields: { is_freeze, reserve_x, reserve_y },
    },
  },
}) {
  if (is_freeze) log.warn({ objectId, type }, 'pool is frozen')

  const [type_a_raw, type_b] = type.match(/0x[^\s,>]+::[^\s,>]+::[^\s,>]+/g)
  const type_a = type_a_raw.substring(type_a_raw.lastIndexOf('<') + 1)

  const decimals_a = await get_decimals(type_a)
  const decimals_b = await get_decimals(type_b)

  const balance_a = new BigNumber(reserve_x).div(10 ** decimals_a)
  const balance_b = new BigNumber(reserve_y).div(10 ** decimals_b)

  const price_a_b = balance_b.div(balance_a)
  const price_b_a = balance_a.div(balance_b)

  return format_pool({
    type_a,
    balance_a,
    type_b,
    balance_b,
    price_a_b,
    price_b_a,
  })
}

function with_dex(dex) {
  return pool => ({ dex, ...pool })
}

export default async function parse(pool, data) {
  switch (pool) {
    case 'TURBOS':
      return parse_turbos_pool(data).then(with_dex(pool))
    case 'FLOWX':
      return parse_flowx_pool(data).then(with_dex(pool))
    case 'BLUEMOVE':
      return parse_bluemove(data).then(with_dex(pool))
    default:
      throw new Error('Unknown pool type: ' + pool)
  }
}
