import { Request, Response } from "express";
import mockPrisma from "@/__tests__/__mocks__/prisma";
import * as otpUtils from "@/utils/otp";
import { logSecurityEvent } from "@/libs/logging";
import { SECURITY_EVENT, SEVERITY } from "@/types/security";

jest.mock("@/libs/logging");
jest.mock("@/client/prisma.ts", () => ({
    __esModule: true,
    default: mockPrisma
}));

import { verifyEmail } from "@/controllers/auth.controller";

describe("Auth Controller => VerifyEmail", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    json = jest.fn();
    status = jest.fn(() => ({ json }));
    mockResponse = { status };
  });

  it("should return 400 if no code is provided", async () => {
    mockRequest = { query: {} };

    await verifyEmail(mockRequest as Request, mockResponse as Response);

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: SECURITY_EVENT.EMAIL_VERIFICATION.MISSING_CODE,
        severity: SEVERITY.LOW,
        metadata: {
          failure: {
            reason: "missing_verification_code"
          }
        }
      })
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Code is required."
    });
  });

  it("should return 400 if verification code is invalid", async () => {
    mockRequest = { query: { code: "wrong-code" } };

    mockPrisma.user.findFirst.mockResolvedValue(null);

    await verifyEmail(mockRequest as Request, mockResponse as Response);

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: SECURITY_EVENT.EMAIL_VERIFICATION.INVALID_CODE,
        severity: SEVERITY.MEDIUM,
        metadata: expect.objectContaining({
          failure: {
            reason: "invalid_verification_code"
          },
          codeAttempted: "wrong-code"
        })
      })
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid verification code."
    });
  });

  it("should return 409 if email is already verified", async () => {
    mockRequest = { query: { code: "123456" } };

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      verified: true,
      verificationCode: "123456",
      verificationCodeValidation: new Date()
    });

    await verifyEmail(mockRequest as Request, mockResponse as Response);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { verificationCode: "123456" }
    });

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        eventType: SECURITY_EVENT.EMAIL_VERIFICATION.ALREADY_VERIFIED,
        severity: SEVERITY.MEDIUM,
        metadata: {
          failure: {
            reason: "email_already_verified"
          }
        }
      })
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Email already verified."
    });
  });

  it("should return 400 if code is expired", async () => {
    jest.spyOn(otpUtils, "verifyOTP").mockReturnValue(false);

   mockRequest = { query: { code: "expired-code" } };

    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-321",
      email: "old@example.com",
      verified: false,
      verificationCode: "expired-code",
      verificationCodeValidation: new Date(Date.now() - 100000)
    });

    await verifyEmail(mockRequest as Request, mockResponse as Response);

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-321",
        eventType: SECURITY_EVENT.EMAIL_VERIFICATION.EXPIRED_CODE,
        severity: SEVERITY.MEDIUM,
        metadata: expect.objectContaining({
          failure: {
            reason: "expired_verification_code",
            codeExpiresAt: expect.any(Date)
          }
        })
      })
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Verification code expired."
    });
  });

  it("should verify email successfully", async () => {
    jest.spyOn(otpUtils, "verifyOTP").mockReturnValue(true);

    mockRequest = { query: { code: "valid-code" } };

    const mockUser = {
      id: "user-456",
      email: "verifyme@example.com",
      verified: false,
      verificationCode: "valid-code",
      verificationCodeValidation: new Date()
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, verified: true });

    await verifyEmail(mockRequest as Request, mockResponse as Response);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-456" },
      data: {
        verified: true,
        verificationCode: null,
        verificationCodeValidation: null
      }
    });

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-456",
        eventType: SECURITY_EVENT.EMAIL_VERIFICATION.SUCCESS,
        severity: SEVERITY.INFO,
        metadata: {
          verificationMethod: "otp",
          emailVerified: "verifyme@example.com"
        }
      })
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Email has been verified!"
    });
  });
});

