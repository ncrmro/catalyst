// jest.setup.js
import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log(process.env)
