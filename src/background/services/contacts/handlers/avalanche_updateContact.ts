import { DAppRequestHandler } from '@src/background/connections/dAppConnection/DAppRequestHandler';
import { DAppProviderRequest } from '@src/background/connections/dAppConnection/models';
import { DEFERRED_RESPONSE } from '@src/background/connections/middlewares/models';
import { isContactValid } from '@src/utils/isContactValid';
import { ethErrors } from 'eth-rpc-errors';
import { injectable } from 'tsyringe';
import { Action } from '../../actions/models';
import { ContactsService } from '../ContactsService';

@injectable()
export class AvalancheUpdateContactHandler extends DAppRequestHandler {
  methods = [DAppProviderRequest.AVALANCHE_UPDATE_CONTACT];

  constructor(private contactsService: ContactsService) {
    super();
  }

  handleAuthenticated = async (request) => {
    const [contact] = request.params;

    const { valid, reason } = isContactValid(contact);
    if (!valid) {
      return {
        ...request,
        error: ethErrors.rpc.invalidParams(reason),
      };
    }

    const { contacts } = await this.contactsService.getContacts();

    const existing = contacts.find((c) => c.id === contact.id);

    const actionData = {
      ...request,
      tabId: request.site.tabId,
      displayData: {
        existing,
        contact,
      },
    };
    await this.openApprovalWindow(
      actionData,
      `approve/updateContact?id=${request.id}`
    );
    return { ...request, result: DEFERRED_RESPONSE };
  };

  handleUnauthenticated = (request) => {
    return {
      ...request,
      error: ethErrors.provider.unauthorized(),
    };
  };

  onActionApproved = async (
    pendingAction: Action,
    result,
    onSuccess,
    onError
  ) => {
    try {
      const {
        displayData: { contact },
      } = pendingAction;
      await this.contactsService.updateContact(contact);
      onSuccess(null);
    } catch (e) {
      onError(e);
    }
  };
}
