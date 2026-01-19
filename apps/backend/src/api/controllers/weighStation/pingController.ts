import { Request, Response } from 'express';

export const ping = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'ok',
      message: 'Server is alive!',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Unexpected error while handling request:');

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
};
