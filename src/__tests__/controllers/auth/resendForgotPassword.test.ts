import mockPrisma from "@/__tests__/__mocks__/prisma";

jest.mock("@/client/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
}));

const sendMailMock = jest.fn();

jest.mock("@/libs/mailer", () => ({
  __esModule: true,
  default: {
    sendMail: sendMailMock,
  },
}));

const logSecurityEventMock = jest.fn();

jest.mock("@/libs/logging/securityEvents", () => ({
  __esModule: true,
  logSecurityEvent: logSecurityEventMock,
}));

import { resendForgotPassword } from "@/controllers/auth.controller";
import transporter from "@/libs/mailer";
import { SECURITY_EVENT, SEVERITY } from "@/types/security";
import { Request, Response } from "express";

describe("Auth controller => resendForgotPassword", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));

  beforeEach(() => {
    req = { body: {}, user: { id: "user-123" } };
    res = { status, json } as unknown as Response;

    jest.clearAllMocks();
  });

  it("should return 400 if email is missing", async () => {
    await resendForgotPassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "Email is required.",
    });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        eventType: SECURITY_EVENT.PASSWORD.RESET_REQUESTED,
        severity: SEVERITY.HIGH,
      })
    );
  });

  it("should return 404 if user not found", async () => {
    req.body = { email: "notfound@example.com" };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await resendForgotPassword(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User not found.",
    });
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.USER.NOT_FOUND,
        metadata: expect.objectContaining({
          attemptedEmail: "notfound@example.com",
        }),
      })
    );
  });

  it("should resend reset code if user is found", async () => {
    const mockUser = { id: "user-456", email: "found@example.com" };
    req.body = { email: mockUser.email };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    (sendMailMock as jest.Mock).mockResolvedValue({});

    await resendForgotPassword(req as Request, res as Response);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          forgotPasswordCode: expect.any(String),
          forgotPasswordCodeValidation: expect.any(Date),
        }),
      })
    );

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockUser.email,
        subject: "Your new password reset code",
        html: expect.stringContaining("Your new reset code"),
      })
    );

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.PASSWORD.RESET_CODE_RESENT,
        userId: mockUser.id,
        metadata: expect.objectContaining({
          email: mockUser.email,
          isResend: true,
        }),
      })
    );

    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "New reset code sent to your email.",
    });
  });
});
