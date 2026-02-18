/**
 * BitBadges API Client
 * Lightweight wrapper for BitBadges API calls
 */

export interface ApiClientConfig {
  apiKey?: string;
  apiUrl?: string;
  testnet?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get the API key from environment variable
 */
export function getApiKey(): string | undefined {
  return process.env.BITBADGES_API_KEY;
}

/**
 * Get the base API URL
 */
export function getApiUrl(testnet: boolean = false): string {
  const base = 'https://api.bitbadges.io';
  return testnet ? `${base}/testnet` : base;
}

/**
 * Make an API request to BitBadges
 */
export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown,
  config: ApiClientConfig = {}
): Promise<ApiResponse<T>> {
  const apiKey = config.apiKey || getApiKey();
  const apiUrl = config.apiUrl || getApiUrl(config.testnet);

  if (!apiKey) {
    return {
      success: false,
      error: 'BITBADGES_API_KEY environment variable not set. Set it to use API query tools.'
    };
  }

  try {
    const url = `${apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API Error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json() as T;
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Request failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// Collection APIs
// ============================================

export interface GetCollectionsRequest {
  collectionsToFetch: Array<{
    collectionId: string;
    metadataToFetch?: {
      uris?: string[];
    };
    fetchTotalAndMintBalances?: boolean;
  }>;
  bookmark?: string;
}

export interface CollectionResponse {
  collections: Array<{
    collectionId: string;
    collectionMetadataTimeline: Array<{
      collectionMetadata: {
        uri: string;
        metadata?: {
          name?: string;
          description?: string;
          image?: string;
        };
      };
    }>;
    validBadgeIds: Array<{ start: string; end: string }>;
    manager: string;
    standards: string[];
    [key: string]: unknown;
  }>;
  bookmark?: string;
  hasMore?: boolean;
}

export async function getCollections(
  request: GetCollectionsRequest,
  config?: ApiClientConfig
): Promise<ApiResponse<CollectionResponse>> {
  return apiRequest<CollectionResponse>('/api/v0/collections', 'POST', request, config);
}

// ============================================
// Balance APIs
// ============================================

export interface BalanceResponse {
  balance: {
    balances: Array<{
      amount: string;
      badgeIds: Array<{ start: string; end: string }>;
      ownershipTimes: Array<{ start: string; end: string }>;
    }>;
    [key: string]: unknown;
  };
}

export async function getBalance(
  collectionId: string,
  address: string,
  config?: ApiClientConfig
): Promise<ApiResponse<BalanceResponse>> {
  return apiRequest<BalanceResponse>(
    `/api/v0/collections/${collectionId}/balance/${address}`,
    'POST',
    {},
    config
  );
}

// ============================================
// Simulation APIs
// ============================================

export interface SimulateRequest {
  txs: Array<{
    context: {
      address: string;
      chain: string;
    };
    messages: unknown[];
    memo?: string;
    fee?: {
      amount: Array<{ denom: string; amount: string }>;
      gas: string;
    };
  }>;
}

export interface SimulateResponse {
  results: Array<{
    gasUsed?: string;
    events?: unknown[];
    error?: string;
  }>;
}

export async function simulateTx(
  request: SimulateRequest,
  config?: ApiClientConfig
): Promise<ApiResponse<SimulateResponse>> {
  return apiRequest<SimulateResponse>('/api/v0/simulate', 'POST', request, config);
}

// ============================================
// Ownership Verification APIs
// ============================================

export interface VerifyOwnershipRequest {
  address: string;
  assetOwnershipRequirements: {
    $and?: unknown[];
    $or?: unknown[];
    $not?: unknown;
    assets?: Array<{
      collectionId: string;
      tokenIds: Array<{ start: string; end: string }>;
      ownershipTimes: Array<{ start: string; end: string }>;
      amountRange: { start: string; end: string };
    }>;
  };
}

export interface VerifyOwnershipResponse {
  success: boolean;
  verified: boolean;
  details?: unknown;
}

export async function verifyOwnership(
  request: VerifyOwnershipRequest,
  config?: ApiClientConfig
): Promise<ApiResponse<VerifyOwnershipResponse>> {
  return apiRequest<VerifyOwnershipResponse>('/api/v0/verifyOwnershipRequirements', 'POST', request, config);
}

// ============================================
// Search APIs
// ============================================

export interface SearchRequest {
  searchValue: string;
  specificCollectionId?: string;
}

export interface SearchResponse {
  collections?: Array<{
    collectionId: string;
    [key: string]: unknown;
  }>;
  accounts?: Array<{
    address: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export async function search(
  request: SearchRequest,
  config?: ApiClientConfig
): Promise<ApiResponse<SearchResponse>> {
  return apiRequest<SearchResponse>('/api/v0/search', 'POST', request, config);
}
