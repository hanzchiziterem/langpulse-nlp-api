import request from 'supertest';
import app from '../app'; // your Express app


describe('NLP Analyze API', () => {
  it('should return analysis for valid input text', async () => {
    const res = await request(app).post('/api/v1/nlp/analyze').send({
      text: 'After years of hard work, he finally published his first novel and it’s a bestseller!',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('sentiment');
    expect(res.body).toHaveProperty('tone');
    expect(res.body).toHaveProperty('topics');
  });
});
