import { ExtensionRequest } from '@src/background/connections/extensionConnection/models';

import { UnifiedBridgeTransferAsset } from './unifiedBridgeTransferAsset';
import { buildRpcCall } from '@src/tests/test-utils';

describe('src/background/services/unifiedBridge/handlers/unifiedBridgeTransferAsset', () => {
  const unifiedBridgeService = {
    transfer: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const asset = {};
  const amount = 100n;
  const targetChainId = 5;
  const request = {
    id: '123',
    method: ExtensionRequest.UNIFIED_BRIDGE_GET_FEE,
    params: [asset, amount, targetChainId],
    tabId: 1234,
  } as any;

  it('calls .transfer() with proper params', async () => {
    const handler = new UnifiedBridgeTransferAsset(unifiedBridgeService);

    await handler.handle(buildRpcCall(request, 'eip155:1'));

    expect(unifiedBridgeService.transfer).toHaveBeenCalledWith({
      asset,
      amount,
      sourceChainId: 1,
      targetChainId,
      tabId: request.tabId, // include the tabId
    });
  });

  it('returns hash of the source chain transfer transaction', async () => {
    jest.mocked(unifiedBridgeService.transfer).mockResolvedValue({
      sourceTxHash: 'sourceTxHash',
    });

    const handler = new UnifiedBridgeTransferAsset(unifiedBridgeService);

    const { result } = await handler.handle(buildRpcCall(request, 'eip155:1'));

    expect(result).toEqual('sourceTxHash');
  });
});
