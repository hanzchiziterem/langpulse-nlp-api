import request from 'supertest';
import app from '../app'; 

describe('POST /api/v1/auth/signup', () => {
  it('should signup a user.', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      name: "test1",
      email: 'test@gmail.com',
      password: 'test@123',
    }).expect(201);

    expect(res.body).toHaveProperty('success')
    expect(res.body).toHaveProperty('message')   
  });
});

describe('POST /api/v1/auth/signin', () => {
  it('should signin a user with valid credentials.', async () => {
    const res = await request(app).post('/api/v1/auth/signin').send({
      email: 'test@example.com',
      password: 'test@123',
    }).expect(200)

    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('token');
  });
});
