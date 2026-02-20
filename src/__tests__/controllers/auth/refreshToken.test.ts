import { Request, Response } from "express";
import { refreshTokenHandler } from "@/controllers/auth.controller";
import { refreshAccessToken } from "@/services/auth.service";
import { mockGetUserIdFromToken } from "@/__tests__/__mocks__/authUtils";

jest.mock("@/services/auth.service.ts");

describe("Auth Controller => refreshTokenHandler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      cookies: {},
      securityContext: {
        ipAddress: "127.0.0.1",
        userAgent: "jest-test",
        timestamp: new Date().toISOString(),
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        responseObject = data;
        return mockResponse;
      }),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it("should return 401 if no refresh token is provided", async () => {
    await refreshTokenHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseObject).toEqual({
      success: false,
      message: "Refresh token required.",
    });
  });

  it("should return 200 and set new refresh token on success", async () => {
    const fakeRefreshToken = "valid-refresh-token";
    mockRequest.cookies = { refreshToken: fakeRefreshToken };

    (refreshAccessToken as jest.Mock).mockResolvedValue({
      newAccessToken: "new-access-token",
      newRefreshToken: "new-refresh-token",
    });

    mockGetUserIdFromToken("user-123");
    await refreshTokenHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "new-refresh-token",
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        path: "/api/v1/auth/refresh-token",
      })
    );

    expect(responseObject).toEqual({
      success: true,
      message: "Refresh token expires in 1hr.",
      accessToken: "new-access-token",
      expiresIn: 3600,
    });
  });

  it("should return 403 for invalid token", async () => {
    const fakeToken = "invalid-token";
    mockRequest.cookies = { refreshToken: fakeToken };

    (refreshAccessToken as jest.Mock).mockRejectedValue(
      new Error("Invalid refresh token")
    );
    mockGetUserIdFromToken("user-123");

    await refreshTokenHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith("refreshToken");
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(responseObject).toEqual({
      success: false,
      message: "Invalid refresh token",
    });
  });

  it("should return 401 for expired token", async () => {
    const expiredToken = "expired-token";
    mockRequest.cookies = { refreshToken: expiredToken };

    (refreshAccessToken as jest.Mock).mockRejectedValue(
      new Error("Refresh token expired")
    );

    mockGetUserIdFromToken("user-123");
    await refreshTokenHandler(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith("refreshToken");
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(responseObject).toEqual({
      success: false,
      message: "Refresh token expired",
    });
  });
});
