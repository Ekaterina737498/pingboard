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
  {
    me: {
      id: string;
      email: string;
      role: string;
      emailVerifiedAt: string | null;
    };
  },
  Record<string, never>
> = gql`
  query Me {
    me {
      id
      email
      role
      emailVerifiedAt
    }
  }
`;

export const VERIFY_EMAIL: TypedDocumentNode<
  { verifyEmail: boolean },
  { token: string }
> = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

export const RESEND_VERIFICATION: TypedDocumentNode<
  { resendVerificationEmail: boolean },
  Record<string, never>
> = gql`
  mutation ResendVerification {
    resendVerificationEmail
  }
`;

export type Site = {
  id: string;
  name: string;
  url: string;
  lastCheck: {
    ok: boolean;
    statusCode: number | null;
    responseTimeMs: number | null;
    error: string | null;
    checkedAt: string;
  } | null;
};

export const SITES: TypedDocumentNode<
  { sites: Site[] },
  Record<string, never>
> = gql`
  query Sites {
    sites {
      id
      name
      url
      lastCheck {
        ok
        statusCode
        responseTimeMs
        error
        checkedAt
      }
    }
  }
`;

export const ADD_SITE: TypedDocumentNode<
  { addSite: { id: string } },
  { input: { name: string; url: string } }
> = gql`
  mutation AddSite($input: AddSiteInput!) {
    addSite(input: $input) {
      id
    }
  }
`;

export const REMOVE_SITE: TypedDocumentNode<
  { removeSite: { id: string } },
  { id: string }
> = gql`
  mutation RemoveSite($id: String!) {
    removeSite(id: $id) {
      id
    }
  }
`;

export type Check = {
  id: string;
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
};

export const SITE_PAGE: TypedDocumentNode<
  {
    site: { id: string; name: string; url: string };
    siteUptime: number | null;
    siteChecks: Check[];
  },
  { id: string }
> = gql`
  query SitePage($id: String!) {
    site(id: $id) {
      id
      name
      url
    }
    siteUptime(siteId: $id)
    siteChecks(siteId: $id, limit: 50) {
      id
      ok
      statusCode
      responseTimeMs
      error
      checkedAt
    }
  }
`;
