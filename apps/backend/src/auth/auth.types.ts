export interface UserProfile {
  id: string;         // Google sub (고유 ID)
  email: string;
  name: string;
  picture: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  dbId?: string;      // DB UUID from User table
}
