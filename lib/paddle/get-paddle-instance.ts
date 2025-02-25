import { SubscriptionDetailResponse, SubscriptionResponse } from '@/types/subcscription.types';
import { Environment, LogLevel, Paddle, PaddleOptions } from '@paddle/paddle-node-sdk';
import {getUserWithSubscription } from '../sessions';
import { ErrorMessage, getErrorMessage, parseSDKResponse } from './data-helpers';

export function getPaddleInstance() {
  const paddleOptions: PaddleOptions = {
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as Environment) ?? Environment.sandbox,
    logLevel: LogLevel.error,
  };

  if (!process.env.PADDLE_API_KEY) {
    console.error('Paddle API key is missing');
  }

  return new Paddle(process.env.PADDLE_API_KEY!, paddleOptions);
}



