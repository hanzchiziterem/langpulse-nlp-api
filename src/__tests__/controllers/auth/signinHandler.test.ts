import { Request, Response } from "express";
import { signinHandler } from "@/controllers/auth.controller";
import { signinUser } from "@/services/auth.service";

jest.mock("../../../services/auth.service.ts");

describe("Auth Controller => signinHandler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {
        email: "test@example.com",
        password: "ValidPass123!",
      },
      securityContext: {
        ipAddress: "127.0.0.1",
        userAgent: "jest-test",
        timestamp: new Date().toISOString(),
      },
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        responseObject = data;
        return mockResponse;
      }),
      cookie: jest.fn(),
    };
  });

  it("should signin user successfully", async () => {
    (signinUser as jest.Mock).mockResolvedValue({
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
    });

    await signinHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "test-refresh-token",
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      })
    );
    expect(responseObject).toEqual({
      success: true,
      message: "User has signed in successfully.",
      accessToken: "test-access-token",
    });
  });

  //it("should return 400 for invalid email format", async () => {
  //   mockRequest.body = {
  //     email: "not-an-email",
  //     password: "123",
  //   };

  //   await signinHandler(mockRequest as Request, mockResponse as Response);

  //   expect(mockResponse.status).toHaveBeenCalledWith(400);
  //   expect(responseObject).toHaveProperty("email");
  // });

  it("should return 401 for invalid credentials", async () => {
    (signinUser as jest.Mock).mockRejectedValue(
      new Error("Invalid credentials")
    );

    await signinHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseObject).toEqual({
      success: false,
      message: "Invalid credentials",
    });
  });
});
