import { Request, Response } from 'express';
import { signoutHandler } from '@/controllers/auth.controller';
import { signoutUser } from '@/services/auth.service';
import { logSecurityEvent } from '@/libs/logging';
import { getFriendlyError } from '@/utils/getFriendlyError';

jest.mock('@/services/auth.service');
jest.mock('@/libs/logging');
jest.mock('@/utils/getFriendlyError', () => ({
  getFriendlyError: jest.fn((msg) => msg),
}));

describe('Auth Controller => signoutHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      cookies: {},
      securityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
        timestamp: new Date().toISOString(),
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        responseObject = data;
        return mockResponse;
      }),
      clearCookie: jest.fn(),
    };
  });

  it('should return 400 and log event if no refresh token is provided', async () => {
    await signoutHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(responseObject).toEqual({
      success: false,
      message: 'No token provided.',
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH:MISSING_SIGNOUT_TOKEN',
      })
    );
  });

  it('should sign out user and clear cookie', async () => {
    mockRequest.cookies = { refreshToken: 'valid-token' };
    (signoutUser as jest.Mock).mockResolvedValue('user-123');

    await signoutHandler(mockRequest as Request, mockResponse as Response);

    expect(signoutUser).toHaveBeenCalledWith('valid-token');
    expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(responseObject).toEqual({
      success: true,
      message: 'Signed out successfully.',
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH:SIGNOUT_SUCCESS',
        userId: 'user-123',
      })
    );
  });

  it('should return 404 if user not found', async () => {
    mockRequest.cookies = { refreshToken: 'bad-token' };
    const err = new Error('USER_NOT_FOUND');
    (signoutUser as jest.Mock).mockRejectedValue(err);

    await signoutHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(responseObject).toEqual({
      success: false,
      message: 'USER_NOT_FOUND',
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH:SIGNOUT_FAILED',
        metadata: expect.objectContaining({
          failure: expect.objectContaining({
            reason: 'user_not_found',
            errorMessage: 'USER_NOT_FOUND',
          }),
        }),
      })
    );
  });

  it('should return 401 on unknown error', async () => {
    mockRequest.cookies = { refreshToken: 'bad-token' };
    const err = new Error('Some system failure');
    (signoutUser as jest.Mock).mockRejectedValue(err);

    await signoutHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseObject).toEqual({
      success: false,
      message: 'Some system failure',
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AUTH:SIGNOUT_FAILED',
        metadata: expect.objectContaining({
          failure: expect.objectContaining({
            reason: 'system_error',
            errorMessage: 'Some system failure',
          }),
        }),
      })
    );
  });
});
