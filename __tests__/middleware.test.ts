type MockResponse = {
  headers: {
    set: jest.Mock;
    get: (key: string) => string | undefined;
  };
  _store: Map<string, string>;
};

function createMockResponse(): MockResponse {
  const store = new Map<string, string>();
  return {
    headers: {
      set: jest.fn((key: string, value: string) => store.set(key, value)),
      get: (key: string) => store.get(key),
    },
    _store: store,
  };
}

jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(),
  },
}));

import { NextResponse } from "next/server";
import { middleware } from "@/middleware";

const mockNextResponseNext = NextResponse.next as jest.Mock;

describe("middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls NextResponse.next to pass the request through", () => {
    const mockResponse = createMockResponse();
    mockNextResponseNext.mockReturnValue(mockResponse);

    middleware({} as Parameters<typeof middleware>[0]);

    expect(mockNextResponseNext).toHaveBeenCalledTimes(1);
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const mockResponse = createMockResponse();
    mockNextResponseNext.mockReturnValue(mockResponse);

    middleware({} as Parameters<typeof middleware>[0]);

    expect(mockResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options to DENY", () => {
    const mockResponse = createMockResponse();
    mockNextResponseNext.mockReturnValue(mockResponse);

    middleware({} as Parameters<typeof middleware>[0]);

    expect(mockResponse.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", () => {
    const mockResponse = createMockResponse();
    mockNextResponseNext.mockReturnValue(mockResponse);

    middleware({} as Parameters<typeof middleware>[0]);

    expect(mockResponse.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("returns the response from NextResponse.next", () => {
    const mockResponse = createMockResponse();
    mockNextResponseNext.mockReturnValue(mockResponse);

    const result = middleware({} as Parameters<typeof middleware>[0]);

    expect(result).toBe(mockResponse);
  });
});

describe("middleware config", () => {
  it("exports a matcher config excluding static assets", async () => {
    const { config } = await import("@/middleware");
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher[0]).toMatch(/_next\/static/);
  });
});
