import { gql, type TypedDocumentNode } from "@apollo/client";

type Credentials = { input: { email: string; password: string } };

export const LOGIN: TypedDocumentNode<
  { login: { accessToken: string } },
  Credentials
> = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

export const REGISTER: TypedDocumentNode<
  { register: { id: string } },
  Credentials
> = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id
    }
  }
`;

export const LOGOUT: TypedDocumentNode<
  { logout: boolean },
  Record<string, never>
> = gql`
  mutation Logout {
    logout
  }
`;

export const ME: TypedDocumentNode<
  { me: { id: string; email: string; role: string } },
  Record<string, never>
> = gql`
  query Me {
    me {
      id
      email
      role
    }
  }
`;
