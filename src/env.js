const {
  PORT: port = 3000,
  SUI_PRIVATE_KEY = '',
  MIN_LIQUIDITY: min_liquidity = 5000,
} = process.env

export const PORT = +port
export const MIN_LIQUIDITY = +min_liquidity

export { SUI_PRIVATE_KEY }
