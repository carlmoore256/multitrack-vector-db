import { PrismaClient, Client } from '@prisma/client';
import { randomBytes } from 'crypto';
import { genSaltSync, hashSync } from 'bcrypt';

const prisma = new PrismaClient();

async function createClient(name: string, email : string, password: string) : Promise<Client> {
  const apiKey = randomBytes(32).toString('hex');
  const salt = genSaltSync(10);
  const passwordHash  = hashSync(password, salt);
  const newClient = await prisma.client.create({
    data: {
      email,
      apiKey,
      passwordHash,
      name,
    },
  });
  return newClient;
}


// const client = await createClient("laptop", "carlmoore256@gmail.com", "password1234");