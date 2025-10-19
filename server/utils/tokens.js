import jwt from 'jsonwebtoken';

export function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    username: user.username,
  };
  const secret = process.env.JWT_SECRET || 'changeme';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}
