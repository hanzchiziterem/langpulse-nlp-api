import { Request, Response } from "express";
import { logSecurityEventMock } from "../__mocks__/logging";
import request from "supertest";

jest.mock("../../libs/logging", () => ({
  __esModule: true,
  logSecurityEvent: logSecurityEventMock,
}));

jest.mock("../../utils/auth", () => ({
  __esModule: true,
  getIdentifier: (req: Request) => req.ip || "unknown-ip",
}));

import { createTestApp } from "./testApp";

describe("Rate Limiter Middleware", () => {
  let app: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  it("should allow requests within the limit", async () => {
    for (let i = 0; i < 3; i++) {
     const res = await request(app).post("/test");
     expect(res.status).toBe(200)
    }
  });

  it("should block requests after the limit has been exceeded and log event", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post("/test")
    }

    const res = await request(app).post("/test");

    expect(res.status).toBe(429);
    expect(res.body.message).toContain("Too many requests. Please try again in 15 minutes.");
    
    expect(logSecurityEventMock).toHaveBeenCalled()
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        eventType: "REQUEST:RATE_LIMITED",
        severity: "HIGH",
        //Check this later.
        // metadata: expect.objectContaining({
        //   method: "POST",
        //   path: "/test",
        //   statusCode: 429,
        //   isAuthenticated: true,
        //   parameters: expect.objectContaining({
        //     identifier: "127.0.0.1",
        //     limit: 3,
        //     windowMinutes: 15,
        //     ipVersion: "IPv4",
        //   }),
        //   failure: {
        //     reason: "rate_limited",
        //     details: "Limit: 3 requests per 15 minutes",
        //   },
        // }),
      })
    );
  });
});
