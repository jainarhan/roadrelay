import { prisma } from '../prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { LoginInput } from 'shared';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const TOKEN_EXPIRY = '24h';

export async function loginService(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: user.driverId,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      driverId: user.driverId,
    },
  };
}
