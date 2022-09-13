import { ExtensionRequest } from '@src/background/connections/extensionConnection/models';
import { ExtensionRequestHandler } from '@src/background/connections/models';
import { injectable } from 'tsyringe';
import { LockService } from '../LockService';

type HandlerType = ExtensionRequestHandler<
  ExtensionRequest.LOCK_GET_STATE,
  boolean
>;

@injectable()
export class GetLockStateHandler implements HandlerType {
  method = ExtensionRequest.LOCK_GET_STATE as const;

  constructor(private lockService: LockService) {}

  handle: HandlerType['handle'] = async (request) => {
    return {
      ...request,
      result: this.lockService.locked,
    };
  };
}