import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { signupHandler } from '../../../controllers/auth.controller';

dotenv.config({ path: '.env.test' });

jest.mock('../../../client/prisma', () => ({
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

import prisma from '../../../client/prisma';
import { signupUser } from '@/services/auth.service';

jest.mock('../../../libs/logging');
jest.mock('../../../services/auth.service');
jest.mock('../../../libs/mailer');

describe('Auth Controller - signupHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {}, 
      securityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test',
        timestamp: new Date().toISOString(),
      },
      user: undefined,
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
      cookie: jest.fn(),
    };

    (prisma.user.create as jest.Mock).mockReset();
  });

it('should create a user successfully', async () => {
  mockRequest.body = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'ValidPassword123!',
  };

  (signupUser as jest.Mock).mockResolvedValue({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  });

  await signupHandler(mockRequest as Request, mockResponse as Response);

  expect(mockResponse.status).toHaveBeenCalledWith(201);
  expect(responseObject).toEqual({
    success: true,
    data: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  });
});

 it('should handle validation errors', async () => {
  mockRequest.body = {
    name: '', 
    email: 'not-an-email',
    password: '123',
  };

  await signupHandler(mockRequest as Request, mockResponse as Response);

  expect(mockResponse.status).toHaveBeenCalledWith(400);
  expect(responseObject).toEqual({
    _errors: [],
    email: { _errors: ['Invalid email'] },
    password: { _errors: ['String must contain at least 6 character(s)'] }
  });
});

// it('should handle duplicate email errors', async () => {
  //   mockRequest.body = {
  //     name: 'Test User',
  //     email: 'exists@example.com',
  //     password: 'ValidPassword123!',
  //   };

  //   (prisma.user.create as jest.Mock).mockRejectedValue({
  //     code: 'P2002', // Prisma duplicate code
  //     meta: { target: ['email'] },
  //   });

  //   await signupHandler(mockRequest as Request, mockResponse as Response);

  //   expect(mockResponse.status).toHaveBeenCalledWith(400);
  //   expect(responseObject.success).toBe(false);
  //   expect(responseObject.message).toContain('email');
  // });
});