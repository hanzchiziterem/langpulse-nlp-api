import request from 'supertest';
import app from '../app'; 

describe('Auth API', () => {
  it('should signup a user with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
  });
});

describe('Auth API', () => {
  it('should login a user with valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'hanz@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('token');
  });
});
