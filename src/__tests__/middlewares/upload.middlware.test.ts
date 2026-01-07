jest.mock("../../utils/cloudinary");

import request from "supertest";
import { createTestApp } from "../testApp";

describe("Upload Middleware", () => {
  it("allows valid image files", async () => {
    const app = createTestApp();

    const res = await request(app)
      .post("/upload")
      .attach("profileImage", Buffer.from("fake image"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
    });
  });

  it("rejects non-image files", async () => {
    const app = createTestApp();

    const res = await request(app)
      .post("/upload")
      .attach("profileImage", Buffer.from("not an image"), {
        filename: "file.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Only images are allowed");
  });

  it("rejects files larger than 5MB", async () => {
    const app = createTestApp();

    const bigFile = Buffer.alloc(6 * 1024 * 1024); // 6MB

    const res = await request(app)
      .post("/upload")
      .attach("profileImage", bigFile, {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
  });
});
