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

import { resendVerification } from "@/controllers/auth.controller";
import transporter from "@/libs/mailer";
import { Request, Response } from "express";


describe("resendVerification controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    status = jest.fn().mockReturnThis();
    json = jest.fn();
    mockRequest = {
      body: {},
      user: { id: "user-123" },
    };
    mockResponse = {
      status,
      json,
    };
      mockPrisma.securityEvent.create = jest.fn();
      jest.clearAllMocks();

      jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return 400 if user already verified", async () => {
    mockRequest.body.email = "test@example.com";

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      verified: true,
    });

    await resendVerification(mockRequest as Request, mockResponse as Response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: "User already verified.",
    });
  });

  it("should send new code if user unverified", async () => {
    mockRequest.body.email = "unverified@example.com";

    const user = {
      id: "user-456",
      email: "unverified@example.com",
      verified: false,
    };

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({});

    (transporter.sendMail as jest.Mock).mockResolvedValue({});

    await resendVerification(mockRequest as Request, mockResponse as Response);

    expect(transporter.sendMail).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "A new code has been sent.",
    });
  });
});
