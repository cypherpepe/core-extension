import { Network, NetworkContractToken } from '@avalabs/chains-sdk';
import {
  GlacierClient,
  NativeTokenBalance,
  Erc20TokenBalance,
  Erc721TokenBalance,
  CurrencyCode,
} from '@avalabs/glacier-sdk';
import { balanceToDisplayValue, bnToBig } from '@avalabs/utils-sdk';
import { singleton } from 'tsyringe';
import { SettingsService } from '../settings/SettingsService';
import { TokenManagerService } from '../tokens/TokenManagerService';
import {
  NetworkTokenWithBalance,
  TokenType,
  TokenWithBalance,
  TokenWithBalanceERC20,
  NftTokenWithBalance,
  ERC721Metadata,
  TokenAttributeERC721,
} from './models';
import { BN } from 'bn.js';
import { Account } from '../accounts/models';
import { getSmallImageForNFT } from './nft/utils/getSmallImageForNFT';
import { ipfsResolverWithFallback } from '@src/utils/ipsfResolverWithFallback';

@singleton()
export class BalancesServiceGlacier {
  private glacierSdkInstance = new GlacierClient(
    process.env.GLACIER_URL as string
  );
  constructor(
    private settingsService: SettingsService,
    private tokensManagerService: TokenManagerService
  ) {}

  async getBalances(
    accounts: Account[],
    network: Network
  ): Promise<Record<string, Record<string, TokenWithBalance>>> {
    const selectedCurrency: any = (await this.settingsService.getSettings())
      .currency;
    const results = await Promise.allSettled(
      accounts.map(async (acc) => {
        const address = acc.addressC;
        return await Promise.allSettled([
          this.getNativeTokenBalanceForNetwork(
            network,
            address,
            selectedCurrency
          ),
          this.getErc20BalanceForNetwork(network, address, selectedCurrency),
        ])
          .then(([nativeBalance, erc20Balances]) => {
            let results: Record<string, TokenWithBalance> =
              nativeBalance.status === 'fulfilled'
                ? { [nativeBalance.value.symbol]: nativeBalance.value }
                : {};

            if (erc20Balances.status === 'fulfilled') {
              results = { ...results, ...erc20Balances.value };
            }
            return { [address]: results };
          })
          .catch(() => {
            return {};
          });
      })
    ).then((results) => {
      return results
        .filter(
          (
            item
          ): item is PromiseFulfilledResult<
            Record<string, Record<string, TokenWithBalance>>
          > => item.status === 'fulfilled'
        )
        .map((item) => item.value);
    });

    return results.reduce((acc, account) => {
      return { ...account, ...acc };
    }, {});
  }

  getNativeTokenBalanceForNetwork(
    network: Network,
    address: string,
    selectedCurrency: any
  ) {
    return this.glacierSdkInstance
      .getNativeBalance(network.chainId.toString(), address, {
        currency: selectedCurrency.toLocaleLowerCase(),
      })
      .then((res) => res.nativeTokenBalance)
      .then((balance) =>
        this.convertNativeToTokenWithBalance(balance, balance.price?.value ?? 0)
      );
  }

  private convertNativeToTokenWithBalance(
    native: NativeTokenBalance,
    tokenPrice: number
  ): NetworkTokenWithBalance {
    const balance = new BN(native.balance);
    const usdBalance = bnToBig(balance, native.decimals).mul(tokenPrice);
    const balanceDisplayValue = balanceToDisplayValue(balance, native.decimals);

    return {
      ...native,
      logoUri: native.logoUri ?? '',
      type: TokenType.NATIVE,
      description: '',
      balance,
      balanceDisplayValue,
      priceUSD: tokenPrice,
      balanceUSD: usdBalance.toNumber() || 0,
      balanceUsdDisplayValue: tokenPrice ? usdBalance.toFixed(2) : undefined,
    };
  }

  async getErc20BalanceForNetwork(
    network: Network,
    address: string,
    selectedCurrency: any
  ) {
    const tokensWithBalance: TokenWithBalanceERC20[] = [];

    /**
     *  Load all pages to make sure we have all the tokens with balances
     */
    let nextPageToken: string | undefined = undefined;
    do {
      const response = await this.glacierSdkInstance.listErc20Balances(
        network.chainId.toString(),
        address,
        {
          currency: selectedCurrency.toLocaleLowerCase(),
          // glacier has a cap on page size of 100
          pageSize: 100,
          pageToken: nextPageToken,
        }
      );

      tokensWithBalance.push(
        ...this.convertErc20ToTokenWithBalance(response.erc20TokenBalances)
      );
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    const customTokens = await this.tokensManagerService.getTokensForNetwork(
      network
    );
    const activeTokenList = [...customTokens, ...(network.tokens || [])];
    /**
     * Glacier doesnt return tokens without balances so we need to polyfill that list
     * from our own list of tokens. We just set the balance to 0, these zero balance
     * tokens are only used for swap, bridge and tx parsing.
     */
    return [
      ...this.convertNetworkTokenToTokenWithBalance(activeTokenList),
      ...tokensWithBalance, // this needs to be second in the list so it overwrites its zero balance counterpart if there is one
    ].reduce((acc, token) => {
      return { ...acc, [token.address.toLowerCase()]: token };
    }, {});
  }

  private convertNetworkTokenToTokenWithBalance(
    tokens: NetworkContractToken[]
  ): TokenWithBalanceERC20[] {
    return tokens.map((token) => {
      return { ...token, type: TokenType.ERC20, balance: new BN(0) };
    });
  }

  private convertErc20ToTokenWithBalance(
    tokenBalances: Erc20TokenBalance[]
  ): TokenWithBalanceERC20[] {
    return tokenBalances.map(
      (token: Erc20TokenBalance): TokenWithBalanceERC20 => {
        const balance = new BN(token.balance);
        const tokenPrice = token.price?.value;
        const balanceDisplayValue = balanceToDisplayValue(
          balance,
          token.decimals
        );
        const usdBalance = bnToBig(balance, token.decimals).mul(
          tokenPrice ?? 0
        );

        return {
          ...token,
          type: TokenType.ERC20,
          contractType: 'ERC-20',
          description: '',
          balance,
          address: token.address,
          balanceDisplayValue,
          priceUSD: tokenPrice,
          balanceUSD: usdBalance.toNumber() || 0,
          balanceUsdDisplayValue: tokenPrice
            ? usdBalance.toFixed(2)
            : undefined,
        };
      }
    );
  }

  async getNFTBalanceForNetwork(
    network: Network,
    address: string,
    selectedCurrency: CurrencyCode
  ): Promise<NftTokenWithBalance[]> {
    const nftList: Erc721TokenBalance[] = [];

    let nextPageToken: string | undefined = undefined;
    do {
      const response = await this.glacierSdkInstance.listErc721Balances(
        network.chainId.toString(),
        address,
        {
          currency: selectedCurrency,
          // glacier has a cap on page size of 100
          pageSize: 100,
          pageToken: nextPageToken,
        }
      );

      nftList.push(...response.erc721TokenBalances);
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    return Promise.allSettled(
      nftList.map(async (token) => {
        let data: ERC721Metadata = {};
        if (token.tokenUri.startsWith('data:application/json;base64,')) {
          const json = Buffer.from(
            token.tokenUri.substring(29),
            'base64'
          ).toString();
          data = JSON.parse(json);
        } else {
          data = await fetch(ipfsResolverWithFallback(token.tokenUri))
            .then((r) => r.json())
            .catch(() => ({}));
        }
        return this.convertNFTToTokenWithBalance(token, data);
      })
    ).then((results) => {
      return results
        .filter(
          (item): item is PromiseFulfilledResult<NftTokenWithBalance> =>
            item.status === 'fulfilled'
        )
        .map((item) => item.value);
    });
  }

  private convertNFTToTokenWithBalance(
    token: Erc721TokenBalance,
    metadata: ERC721Metadata
  ): NftTokenWithBalance {
    const attributes =
      (metadata.attributes || []).reduce(
        (acc: TokenAttributeERC721[], attr) => {
          return [
            ...acc,
            { name: attr.key ?? attr.trait_type, value: attr.value },
          ];
        },
        []
      ) ?? [];

    return {
      /**
       * Collection name doesnt come back in details of attributes
       * so not sure where this is going to come from. But for now will just
       * say unknown unless token has it eventually
       */
      collectionName: token.name ?? 'Unknown',
      ...token,
      type: TokenType.ERC721,
      logoUri: ipfsResolverWithFallback(metadata.image),
      logoSmall: metadata.image ? getSmallImageForNFT(metadata.image) : '',
      description: metadata.description ?? '',
      address: token.address,
      attributes,
      balance: new BN(0),
    };
  }
}