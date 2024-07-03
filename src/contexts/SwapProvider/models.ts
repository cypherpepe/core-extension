import { APIError, SwapSide } from 'paraswap';
import { OptimalRate } from 'paraswap-core';

/**
 * Paraswap may return both data and an error sometimes.
 * @see https://app.swaggerhub.com/apis/paraswapv5/api/1.0#/PriceRouteWithError
 */
type ParaswapPricesResponseWithError = {
  error: string;
  priceRoute?: OptimalRate;
};

type ParaswapPricesSuccessResponse = {
  error: never;
  priceRoute: OptimalRate;
};

export type ParaswapPricesResponse =
  | ParaswapPricesSuccessResponse
  | ParaswapPricesResponseWithError;

/**
 * Paraswap API errors after which it may be useful to retry the request.
 *
 * @see https://app.swaggerhub.com/apis/paraswapv5/api/1.0#/PriceErrorMessage
 */
export const PARASWAP_RETRYABLE_ERRORS = [
  'Price Timeout',
  'An error has occurred, please try again later or contact our support',
];

export const hasParaswapError = (
  response: ParaswapPricesResponse
): response is ParaswapPricesResponseWithError => {
  return typeof response.error === 'string';
};

export type SwapParams = {
  srcToken: string;
  destToken: string;
  srcDecimals: number;
  destDecimals: number;
  srcAmount: string;
  priceRoute: OptimalRate;
  destAmount: string;
  gasLimit: number;
  slippage: number;
};

export type GetRateParams = {
  srcToken: string;
  srcDecimals: number;
  destToken: string;
  destDecimals: number;
  srcAmount: string;
  swapSide?: SwapSide;
};

export type SwapContextAPI = {
  getRate(params: GetRateParams): Promise<{
    optimalRate: OptimalRate | APIError | null;
    destAmount: string | undefined;
  }>;
  swap(params: SwapParams): Promise<{
    swapTxHash: string;
    approveTxHash: string;
  }>;
};