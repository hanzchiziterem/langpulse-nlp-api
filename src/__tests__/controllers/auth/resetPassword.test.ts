import mockPrisma from "@/__tests__/__mocks__/prisma";

jest.mock("@/client/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

const logSecurityEventMock = jest.fn();
jest.mock("@/libs/logging/securityEvents", () => ({
  __esModule: true,
  logSecurityEvent: logSecurityEventMock,
}));

const resetPassowrdMock = jest.fn();
jest.mock("@/services/auth.service", () => ({
  __esModule: true,
  resetPassowrd: resetPassowrdMock,
}));

import { resetPassword } from "@/controllers/auth.controller";
import { SECURITY_EVENT, SEVERITY } from "@/types/security";
import { Request, Response } from "express";

describe("Auth controller => resetPassword", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  beforeEach(() => {
    req = {
      body: {},
      user: { id: "user-123" },
    };
    res = { status, json } as unknown as Response;

    jest.clearAllMocks();
  });

  it("should return 400 if code or new password is missing", async () => {
    await resetPassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Code and new password are required.",
    });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
        severity: SEVERITY.MEDIUM,
      })
    );
  });

  it("should return 400 if reset code is invalid", async () => {
    req.body = {
      code: "invalid-code",
      newPassword: "newStrongPassword123",
    };

    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await resetPassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid reset code.",
    });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
        metadata: expect.objectContaining({
          failure: expect.any(Object),
          codeAttempted: "invalid-code",
        }),
      })
    );
  });

  it("should return 400 if reset code is expired", async () => {
    const expiredDate = new Date(Date.now() - 1000); // expired
    const mockUser = {
      id: "user-123",
      forgotPasswordCodeValidation: expiredDate,
    };

    req.body = {
      code: "expired-code",
      newPassword: "newStrongPassword123",
    };

    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    await resetPassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Reset code expired.",
    });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.RESET_FAILED,
        severity: SEVERITY.HIGH,
        metadata: expect.objectContaining({
          failure: expect.objectContaining({
            reason: "reset_code_expired",
            codeExpiredAt: expiredDate,
          }),
        }),
      })
    );
  });

  it("should reset password and return success message", async () => {
    const validDate = new Date(Date.now() + 10 * 60 * 1000); // valid future date
    const mockUser = {
      id: "user-123",
      forgotPasswordCodeValidation: validDate,
    };

    req.body = {
      code: "valid-code",
      newPassword: "StrongPass456!",
    };

    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    resetPassowrdMock.mockResolvedValue({});

    await resetPassword(req as Request, res as Response);

    expect(resetPassowrdMock).toHaveBeenCalledWith("user-123", "StrongPass456!");
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.RESET_SUCCESS,
        userId: mockUser.id,
        metadata: expect.objectContaining({
          operationType: "reset",
          strength: expect.objectContaining({
            isAcceptable: true,
            score: expect.any(Number),
          }),
        }),
      })
    );
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Password has been reset successfully.",
    });
  });
});
