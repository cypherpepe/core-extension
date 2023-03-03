import { DAppProviderRequest } from '@src/background/connections/dAppConnection/models';
import { DEFERRED_RESPONSE } from '@src/background/connections/middlewares/models';
import { openExtensionNewWindow } from '@src/utils/extensionUtils';
import { ethErrors } from 'eth-rpc-errors';
import { container } from 'tsyringe';
import { AccountsService } from '../../accounts/AccountsService';
import { AccountType } from '../../accounts/models';
import { ActionsService } from '../../actions/ActionsService';
import { Action, ActionStatus } from '../../actions/models';
import { PermissionsService } from '../../permissions/PermissionsService';
import { WalletRequestPermissionsHandler } from './wallet_requestPermissions';
import { getPermissionsConvertedToMetaMaskStructure } from '../utils/getPermissionsConvertedToMetaMaskStructure';

jest.mock('@src/utils/extensionUtils', () => ({
  openExtensionNewWindow: jest.fn().mockReturnValue({ id: 321 }),
}));

jest.mock('../utils/getPermissionsConvertedToMetaMaskStructure');

describe('background/services/permissions/handlers/wallet_requestPermissions.ts', () => {
  beforeEach(() => {
    container.clearInstances();
  });

  describe('handleAuthenticated', () => {
    it('calls handle authenticated', async () => {
      const handler = new WalletRequestPermissionsHandler(
        {} as PermissionsService,
        {} as AccountsService
      );
      const handleUnauthenticatedSpy = jest.spyOn(
        handler,
        'handleUnauthenticated'
      );

      const actionsServiceMock = {
        addAction: jest.fn(),
      };
      container.registerInstance(ActionsService, actionsServiceMock as any);
      const mockRequest = {
        id: 1234,
        site: {
          domain: 'example.com',
          name: 'Example dapp',
          icon: 'icon.svg',
          tabId: 111,
        },
      };
      await handler.handleAuthenticated(mockRequest);
      expect(handleUnauthenticatedSpy).toBeCalledTimes(1);
      expect(handleUnauthenticatedSpy).toBeCalledWith(mockRequest);
    });
  });
  describe('handleUnauthenticated', () => {
    it('opens permissions window', async () => {
      const handler = new WalletRequestPermissionsHandler(
        {} as PermissionsService,
        {} as AccountsService
      );
      const actionsServiceMock = {
        addAction: jest.fn(),
      };
      container.registerInstance(ActionsService, actionsServiceMock as any);

      const mockRequest = {
        id: 4321,
        site: {
          domain: 'example.com',
          name: 'Example dapp',
          icon: 'icon.svg',
          tabId: 111,
        },
      };

      const result = await handler.handleUnauthenticated(mockRequest);
      expect(result).toEqual({
        ...mockRequest,
        result: DEFERRED_RESPONSE,
      });
      expect(actionsServiceMock.addAction).toHaveBeenCalledTimes(1);
      expect(actionsServiceMock.addAction).toHaveBeenCalledWith({
        ...mockRequest,
        displayData: {
          domainIcon: 'icon.svg',
          domainName: 'Example dapp',
          domainUrl: 'example.com',
        },
        tabId: 111,
        popupWindowId: 321,
      });
      expect(openExtensionNewWindow).toHaveBeenCalledTimes(1);
      expect(openExtensionNewWindow).toHaveBeenCalledWith(
        `permissions?id=4321`,
        ''
      );
    });
  });

  describe('onActionApproved', () => {
    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();

    const accountsServiceMock = {
      getAccountByID: jest.fn(),
      activateAccount: jest.fn(),
    };

    const permissionServiceMock = {
      addPermission: jest.fn(),
      getPermissions: jest.fn(),
    };

    const mockAction: Action = {
      id: 5432,
      status: ActionStatus.SUBMITTING,
      method: DAppProviderRequest.WALLET_PERMISSIONS,
      jsonrpc: '2.0',
      displayData: {},
      time: 12312312,
    };

    beforeEach(() => {
      jest.resetAllMocks();
      accountsServiceMock.getAccountByID.mockReturnValue({
        index: 2,
        id: 'uuid',
        addressC: '0x11111eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        type: AccountType.PRIMARY,
      });
    });

    it('returns error when no account is selected', async () => {
      accountsServiceMock.getAccountByID.mockReturnValueOnce(undefined);

      const handler = new WalletRequestPermissionsHandler(
        permissionServiceMock as any,
        accountsServiceMock as any
      );

      await handler.onActionApproved(
        { ...mockAction },
        undefined,
        onSuccessMock,
        onErrorMock
      );

      expect(permissionServiceMock.addPermission).not.toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        ethErrors.rpc.internal('Selected account not found')
      );
    });

    it('returns error when domain not set', async () => {
      const handler = new WalletRequestPermissionsHandler(
        permissionServiceMock as any,
        accountsServiceMock as any
      );

      await handler.onActionApproved(
        { ...mockAction },
        'uuid',
        onSuccessMock,
        onErrorMock
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        ethErrors.rpc.internal('Domain not set')
      );
      expect(permissionServiceMock.addPermission).not.toHaveBeenCalled();
      expect(accountsServiceMock.activateAccount).not.toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('updates permissons for selected account on calls onSuccess', async () => {
      const mockPermissions = {
        'example.com': {
          domain: 'example.com',
          accounts: {
            '123': true,
            '0x11111eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': true,
          },
        },
      };
      const metamaskStructure = [
        { invoker: 'example.com', parentCapabitily: 'accounts' },
      ];
      (getPermissionsConvertedToMetaMaskStructure as jest.Mock).mockReturnValue(
        metamaskStructure
      );

      permissionServiceMock.getPermissions.mockReturnValue(mockPermissions);

      const handler = new WalletRequestPermissionsHandler(
        permissionServiceMock as any,
        accountsServiceMock as any
      );

      await handler.onActionApproved(
        { ...mockAction, site: { domain: 'example.com' } },
        'uuid',
        onSuccessMock,
        onErrorMock
      );

      expect(onErrorMock).not.toHaveBeenCalled();
      expect(permissionServiceMock.addPermission).toHaveBeenCalledTimes(1);
      expect(permissionServiceMock.addPermission).toHaveBeenCalledWith({
        domain: 'example.com',
        accounts: { '0x11111eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': true },
      });
      expect(permissionServiceMock.getPermissions).toHaveBeenCalledTimes(1);
      const currentPermissions = await permissionServiceMock.getPermissions();
      expect(currentPermissions).toBe(mockPermissions);
      expect(accountsServiceMock.activateAccount).toHaveBeenCalledTimes(1);
      expect(accountsServiceMock.activateAccount).toHaveBeenCalledWith('uuid');
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(getPermissionsConvertedToMetaMaskStructure).toHaveBeenCalledTimes(
        1
      );
      expect(onSuccessMock).toHaveBeenCalledWith(metamaskStructure);
    });
  });
});