export interface RegisterDto {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface User {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  type: string
  permissions: string[]
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}
