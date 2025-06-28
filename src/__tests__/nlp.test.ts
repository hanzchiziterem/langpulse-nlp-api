import request from "supertest";
import app from "../app";

describe("POST /api/v1/analyze (authenticated)", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/v1/auth/signin").send({
      email: "hanz@example.com",
      password: "password123",
    });
    token = res.body.token;
  });

  it("should analyze text when authorized", async () => {
    const res = await request(app)
      .post("/api/v1/nlp/analyze")
      .set("Authorization", `Bearer ${token}`)
      .send({
        text: "Artificial Intelligence is transforming the way we work and live. While some people fear job loss, others believe AI will create new opportunities and make our lives easier. It’s important to use this technology responsibly and ensure it benefits everyone.",
      })
      .expect(201);

    expect(res.body).toHaveProperty("result.sentiment");
    expect(res.body).toHaveProperty("result.tone");
    expect(res.body).toHaveProperty("result.topics");
  });
});
