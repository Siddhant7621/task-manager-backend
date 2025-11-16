import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface IUser {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IToken {
  id: string;
  token: string;
  type: string;
  expiresAt: Date;
  blacklisted: boolean;
  userId: string;
  createdAt: Date;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: {
    token: string;
    expires: Date;
  };
  refresh: {
    token: string;
    expires: Date;
  };
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  dueDate?: Date;
  status?: TaskStatus;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  dueDate?: Date;
  status?: TaskStatus;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  search?: string;
}