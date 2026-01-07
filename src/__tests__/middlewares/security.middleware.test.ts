jest.mock("@/libs/logging", () => ({
  __esModule: true,
  logSecurityEvent: jest.fn(),
}));

import request from "supertest";
import { createTestApp } from "./testApp";
import { logSecurityEvent } from "@/libs/logging";
import { SECURITY_EVENT, SEVERITY } from "@/types/security";

const logSecurityEventMock = logSecurityEvent as jest.Mock;

describe("securityContextMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs a successful request (200)", async () => {
    const app = createTestApp();

    await request(app)
      .post("/test")
      .send({ email: "test@example.com" });

    expect(logSecurityEventMock).toHaveBeenCalledTimes(1);

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        eventType: SECURITY_EVENT.REQUEST.PROCESSED,
        severity: SEVERITY.INFO,
        metadata: expect.objectContaining({
          method: "POST",
          path: "/test",
          statusCode: 200,
          isAuthenticated: true,
        }),
      })
    );
  });

  it("logs a blocked request for 401/403-style errors", async () => {
    const app = createTestApp();

    await request(app)
      .post("/upload")
      .attach(
        "profileImage",
        Buffer.from("not an image"),
        {
          filename: "file.txt",
          contentType: "text/plain",
        }
      );

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: SECURITY_EVENT.REQUEST.BLOCKED,
        severity: SEVERITY.MEDIUM,
        metadata: expect.objectContaining({
          statusCode: 400,
          failure: expect.objectContaining({
            reason: "unknown_error",
            details: "HTTP 400",
          }),
        }),
      })
    );
  });

  it("redacts sensitive fields in request body", async () => {
    const app = createTestApp();

    await request(app)
      .post("/test")
      .send({
        password: "super-secret",
        refreshToken: "token-123",
      });

    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          parameters: expect.objectContaining({
            body: {
              password: "**REDACTED**",
              refreshToken: "**REDACTED**",
            },
          }),
        }),
      })
    );
  });
});
