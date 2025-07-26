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

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};
jest.mock("bcrypt", () => mockBcrypt);

jest.mock("@/utils/password", () => ({
  __esModule: true,
  calculatePasswordStrength: () => 85,
  getPasswordStrengthLevel: () => "strong",
}));

import { changePassword } from "@/controllers/auth.controller";
import { SECURITY_EVENT, SEVERITY } from "@/types/security";
import { Request, Response } from "express";

describe("Auth controller => changePassword", () => {
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

  it("should return 400 if old or new password is missing", async () => {
    await changePassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Both old and new passwords are required.",
    });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.CHANGE_FAILED,
        severity: SEVERITY.HIGH,
        metadata: expect.objectContaining({
          failure: { reason: "missing_credentials" },
        }),
      })
    );
  });

  it("should return 404 if user is not found", async () => {
    req.body = { oldPassword: "oldPass", newPassword: "newPass123!" };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await changePassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User not found.",
    });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.USER.NOT_FOUND,
        severity: SEVERITY.INFO,
      })
    );
  });

  it("should return 400 if old password is incorrect", async () => {
    req.body = { oldPassword: "wrongOld", newPassword: "NewValidPass123" };

    const mockUser = { id: "user-123", password: "hashed-password" };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await changePassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Old password is incorrect.",
    });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.CHANGE_FAILED,
        severity: SEVERITY.MEDIUM,
        metadata: expect.objectContaining({
          failure: { reason: "incorrect_old_password" },
        }),
      })
    );
  });

  it("should update password and return success", async () => {
    req.body = { oldPassword: "correctOld", newPassword: "StrongPass123!" };

    const mockUser = { id: "user-123", password: "hashed-old" };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("hashed-new");

    await changePassword(req as Request, res as Response);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { password: "hashed-new" },
    });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.CHANGE_SUCCESS,
        severity: SEVERITY.INFO,
        metadata: expect.objectContaining({
          strength: {
            score: 85,
            level: "strong",
            isAcceptable: true,
          },
        }),
      })
    );

    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Password changed successfully.",
    });
  });
});
