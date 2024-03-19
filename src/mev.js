import BigNumber from 'bignumber.js'

import logger from './logger.js'

const log = logger(import.meta)

export function search_opportunity(token_pools) {
  let totalValue = new BigNumber(0)
  let totalTokens = new BigNumber(0)
  let totalCosts = new BigNumber(0)
  let totalProfit = new BigNumber(0)

  // Calculate total value and total tokens to find the average price
  token_pools.forEach(pool => {
    const price = new BigNumber(pool.price)
    const tokenBalance = new BigNumber(pool.token_balance)
    totalValue = totalValue.plus(tokenBalance.multipliedBy(price))
    totalTokens = totalTokens.plus(tokenBalance)
  })

  const averagePrice = totalValue.dividedBy(totalTokens)

  // Determine actions for each pool to reach the average price
  token_pools.forEach(pool => {
    const currentPrice = new BigNumber(pool.price)
    const tokenBalance = new BigNumber(pool.token_balance)
    const targetSuiValue = tokenBalance.multipliedBy(averagePrice)
    const currentSuiValue = tokenBalance.multipliedBy(currentPrice)

    if (currentPrice.isGreaterThan(averagePrice)) {
      // Calculate profit by selling tokens in pools where price is above the average
      const profit = currentSuiValue.minus(targetSuiValue)
      log.info(
        { dex: pool.dex, token: pool.type, profit: profit.toFixed(2) },
        'sell',
      )
      totalProfit = totalProfit.plus(profit)
    } else if (currentPrice.isLessThan(averagePrice)) {
      // Calculate cost by buying tokens in pools where price is below the average
      const cost = targetSuiValue.minus(currentSuiValue)
      log.info(
        { dex: pool.dex, token: pool.type, cost: cost.toFixed(2) },
        'buy',
      )
      totalCosts = totalCosts.plus(cost)
    }
  })

  // Calculate net profit by subtracting total costs from total profits
  const netProfit = totalProfit.minus(totalCosts)
  log.info({ netProfit: netProfit.toFixed(2) }, 'net profit')
}
