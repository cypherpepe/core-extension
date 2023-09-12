import { ethErrors } from 'eth-rpc-errors';
import AbstractConnection from './AbstractConnection';
import { Message } from './models';
import { DEFERRED_RESPONSE } from '@src/background/connections/middlewares/models';
import * as environment from '@src/utils/environment';

class TestConnection extends AbstractConnection {
  constructor(
    private mocks: {
      connect: jest.Mock;
      disconnect: jest.Mock;
      send: jest.Mock;
    },
    concurrentReuestLimit = 1000
  ) {
    super(concurrentReuestLimit);
  }

  _connect = () => {
    this.mocks.connect();
  };

  _disconnect = () => {
    this.mocks.disconnect();
  };

  _send = (message) => {
    this.mocks.send(message);
  };

  fakeMessage = (message: Message) => {
    this.onMessage(message);
  };
}

describe('background/providers/utils/AbstractConnection', () => {
  const mocks = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects', () => {
    const testConnection = new TestConnection(mocks);

    expect(mocks.connect).not.toHaveBeenCalled();

    testConnection.connect();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
  });

  it('sends request through connection with uuid generated and waits for response', (done) => {
    const testConnection = new TestConnection(mocks);

    const promise = testConnection.request({ method: 'some-method' });

    promise.then((response) => {
      expect(response).toBe('success');
      done();
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'request',
      id: '00000000-0000-0000-0000-000000000000',
      data: {
        method: 'some-method',
        id: '00000000-0000-0000-0000-000000000000',
      },
    });

    testConnection.fakeMessage({
      type: 'response',
      id: '00000000-0000-0000-0000-000000000000',
      res: 'success',
      err: undefined,
    });
  });

  it('rejects request on error', (done) => {
    const testConnection = new TestConnection(mocks);

    const promise = testConnection.request({ method: 'some-method' });

    promise.catch((error) => {
      expect(error).toBe('some-error');
      done();
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'request',
      id: '00000000-0000-0000-0000-000000000000',
      data: {
        method: 'some-method',
        id: '00000000-0000-0000-0000-000000000000',
      },
    });

    testConnection.fakeMessage({
      type: 'response',
      id: '00000000-0000-0000-0000-000000000000',
      res: undefined,
      err: 'some-error',
    });
  });

  it('does nothing with pending request if response id is unknown', async () => {
    const testConnection = new TestConnection(mocks);

    const promise = testConnection.request({ method: 'some-method' });

    const errorCallback = jest.fn();
    promise.catch(errorCallback);

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'request',
      id: '00000000-0000-0000-0000-000000000000',
      data: {
        method: 'some-method',
        id: '00000000-0000-0000-0000-000000000000',
      },
    });

    testConnection.fakeMessage({
      type: 'response',
      id: '111111111-0000-0000-0000-000000000000',
      res: undefined,
      err: 'some-error',
    });

    await new Promise(process.nextTick);

    expect(errorCallback).not.toHaveBeenCalled();

    testConnection.fakeMessage({
      type: 'response',
      id: '00000000-0000-0000-0000-000000000000',
      res: undefined,
      err: 'some-error',
    });

    await new Promise(process.nextTick);
    expect(errorCallback).toHaveBeenCalledWith('some-error');
  });

  it('rejects pending requests on dispose and closes connection', (done) => {
    const testConnection = new TestConnection(mocks);

    const promise = testConnection.request({ method: 'some-method' });

    promise.catch((error) => {
      expect(error).toStrictEqual(ethErrors.provider.userRejectedRequest());
      expect(mocks.disconnect).toBeCalledTimes(1);
      done();
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'request',
      id: '00000000-0000-0000-0000-000000000000',
      data: {
        method: 'some-method',
        id: '00000000-0000-0000-0000-000000000000',
      },
    });

    testConnection.dispose();
  });

  it('rejects request if above the concurrency limit', () => {
    const testConnection = new TestConnection(mocks, 1);

    testConnection.request({ method: 'some-method' });
    try {
      testConnection.request({ method: 'some-method2' });
    } catch (e) {
      expect(e).toStrictEqual(ethErrors.rpc.limitExceeded());
    }
  });

  it('sends messages', () => {
    const testConnection = new TestConnection(mocks);

    testConnection.message({ event: 'some-data' });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'message',
      data: { event: 'some-data' },
    });
  });

  it('sends deferred responses', () => {
    const testConnection = new TestConnection(mocks);

    testConnection.deferredResponse('id', 'result', null);

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      type: 'response',
      id: 'id',
      res: 'result',
      err: null,
    });
  });

  describe('onRequest', () => {
    it('does nothing when no listenCallback is defined', () => {
      const testConnection = new TestConnection(mocks);

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      expect(mocks.send).not.toHaveBeenCalled();
    });

    it('sends response returned by the callback back', async () => {
      const testConnection = new TestConnection(mocks);

      testConnection.connect(async (request) => {
        expect(request).toStrictEqual({ method: 'some-method' });
        return 'result';
      });

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      await new Promise(process.nextTick);

      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.send).toHaveBeenCalledWith({
        type: 'response',
        id: '0000',
        res: 'result',
        err: undefined,
      });
    });

    it('does not send back response for DEFERRED_RESPONSEes', async () => {
      const testConnection = new TestConnection(mocks);

      testConnection.connect(async (request) => {
        expect(request).toStrictEqual({ method: 'some-method' });
        return DEFERRED_RESPONSE;
      });

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      await new Promise(process.nextTick);

      expect(mocks.send).not.toHaveBeenCalled();
    });

    it('sends error back', async () => {
      const testConnection = new TestConnection(mocks);

      testConnection.connect(async (request) => {
        expect(request).toStrictEqual({ method: 'some-method' });
        throw new Error('some error');
      });

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      await new Promise(process.nextTick);

      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.send).toHaveBeenCalledWith({
        err: { message: 'some error' },
        id: '0000',
        res: undefined,
        type: 'response',
      });
    });

    it('sends error code and data back if present', async () => {
      const testConnection = new TestConnection(mocks);

      testConnection.connect(async (request) => {
        expect(request).toStrictEqual({ method: 'some-method' });
        throw ethErrors.rpc.invalidParams({
          message: 'param1',
          data: 'some-data',
        });
      });

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      await new Promise(process.nextTick);

      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.send).toHaveBeenCalledWith({
        err: { code: -32602, message: 'param1', data: 'some-data' },
        id: '0000',
        res: undefined,
        type: 'response',
      });
    });

    it('sends error stack back if in development mode', async () => {
      jest.spyOn(environment, 'isDevelopment').mockReturnValue(true);

      const testConnection = new TestConnection(mocks);
      const error = ethErrors.rpc.invalidParams({
        message: 'param1',
        data: 'some-data',
      });

      testConnection.connect(async (request) => {
        expect(request).toStrictEqual({ method: 'some-method' });
        throw error;
      });

      testConnection.fakeMessage({
        type: 'request',
        id: '0000',
        data: { method: 'some-method' },
      });

      await new Promise(process.nextTick);

      expect(mocks.send).toHaveBeenCalledTimes(1);
      expect(mocks.send).toHaveBeenCalledWith({
        err: {
          code: -32602,
          message: 'param1',
          data: 'some-data',
          stack: error.stack,
        },
        id: '0000',
        res: undefined,
        type: 'response',
      });
    });
  });
});