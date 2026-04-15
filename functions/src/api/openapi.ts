export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Knowledge Base API",
    description:
      "Cloud Functions API for managing contexts, stores, queries, memories, and files",
    version: "1.0.0",
    contact: {
      name: "CosmoOps",
    },
  },
  servers: [
    {
      url: "https://kb.cosmoops.com",
    },
  ],
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API Key for authentication",
      },
      userToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Firebase ID token for user authentication",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
        },
        required: ["error"],
      },
      User: {
        type: "object",
        properties: {
          uid: { type: "string" },
          email: { type: "string" },
          displayName: { type: ["string", "null"] },
          photoURL: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Context: {
        type: "object",
        properties: {
          id: { type: "string" },
          orgId: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          windowSize: { type: ["integer", "null"] },
          documentCount: { type: "integer" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ContextDocument: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique identifier" },
          role: {
            type: "string",
            enum: ["system", "user", "assistant"],
            description: "Role of the document",
          },
          metadata: { description: "Optional metadata" },
          parts: {
            type: "array",
            items: {},
            description: "Content parts of the document",
          },
        },
        required: ["id", "role", "parts"],
      },
      Store: {
        type: "object",
        properties: {
          id: { type: "string" },
          orgId: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          source: {
            type: "object",
            properties: {
              id: { type: "string" },
              collection: { type: "string" },
            },
          },
          documentCount: { type: "integer" },
          customCount: { type: "integer" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Memory: {
        type: "object",
        properties: {
          id: { type: "string" },
          orgId: { type: "string" },
          description: { type: ["string", "null"] },
          documentCapacity: { type: "integer" },
          condenseThresholdPercent: { type: "integer" },
          documentCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MemoryDocument: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          isCondensationSummary: { type: "boolean" },
          sessionId: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      StoreDocument: {
        type: "object",
        properties: {
          id: { type: "string" },
          orgId: { type: "string" },
          storeId: { type: "string" },
          name: { type: "string" },
          kind: { type: "string", enum: ["data", "file", "node"] },
          type: { type: "string" },
          status: { type: "string", enum: ["pending", "completed", "error"] },
          error: { type: ["string", "null"] },
          summary: { type: ["string", "null"] },
          keywords: { type: "array", items: { type: "string" } },
          source: {
            type: "object",
            properties: {
              id: { type: "string" },
              collection: { type: "string" },
            },
          },
          data: { type: "object" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      File: {
        type: "object",
        properties: {
          id: { type: "string" },
          orgId: { type: "string" },
          fileName: { type: "string" },
          originalName: { type: "string" },
          mimeType: { type: "string" },
          kind: { type: "string" },
          size: { type: "integer" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FileDownloadResponse: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Signed download URL (15-minute expiry)",
          },
          expiresIn: {
            type: "integer",
            description: "Seconds until URL expires",
          },
        },
      },
      FileThumbnailResponse: {
        type: "object",
        properties: {
          url: { type: "string", description: "Signed URL for image files" },
          data: {
            type: "string",
            description: "Base64 data URL for non-image files",
          },
          contentType: { type: "string", description: "MIME type of the file" },
          isImage: {
            type: "boolean",
            description: "Whether the file is an image",
          },
        },
      },
      FileUploadResponse: {
        type: "object",
        properties: {
          file: { $ref: "#/components/schemas/File" },
        },
      },
      FileDeleteResponse: {
        type: "object",
        properties: {
          deleted: { type: "boolean" },
        },
      },
    },
  },
  security: [
    {
      apiKey: [],
    },
  ],
  paths: {
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "healthCheck",
        security: [],
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/context": {
      post: {
        tags: ["Contexts"],
        summary: "Create a context",
        operationId: "createContext",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Context name" },
                  description: {
                    type: "string",
                    description: "Optional description",
                  },
                  windowSize: {
                    type: "integer",
                    description: "Optional token window size",
                  },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Context created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    context: { $ref: "#/components/schemas/Context" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/context/{id}/documents": {
      post: {
        tags: ["Contexts"],
        summary: "Add a document to a context",
        operationId: "addContextDocument",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Context ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Document name" },
                  metadata: {
                    type: "object",
                    description: "Optional metadata object",
                  },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Document created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: {
                      $ref: "#/components/schemas/ContextDocument",
                    },
                  },
                },
              },
            },
          },
          400: { description: "Bad request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
      get: {
        tags: ["Contexts"],
        summary: "Get context documents",
        operationId: "getContextDocuments",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Context ID",
          },
        ],
        responses: {
          200: {
            description: "Documents retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    documents: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/ContextDocument",
                          },
                        },
                        hasNext: { type: "boolean" },
                        nextCursor: { type: ["string", "null"] },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
      delete: {
        tags: ["Contexts"],
        summary: "Delete all documents in a context",
        operationId: "deleteContextDocuments",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Context ID",
          },
        ],
        responses: {
          200: {
            description: "Documents deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    deleted: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/context/{id}": {
      delete: {
        tags: ["Contexts"],
        summary: "Delete a context",
        operationId: "deleteContext",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Context ID",
          },
        ],
        responses: {
          200: {
            description: "Context deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    deleted: { type: "boolean" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/store/{storeId}/documents": {
      get: {
        tags: ["Stores"],
        summary: "List store documents",
        operationId: "getStoreDocuments",
        parameters: [
          {
            name: "storeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Store documents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StoreDocument" },
                    },
                    hasNext: { type: "boolean" },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
      post: {
        tags: ["Stores"],
        summary: "Create a store document",
        operationId: "createStoreDocument",
        parameters: [
          {
            name: "storeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Document name (max 100 chars)",
                  },
                  source: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      collection: { type: "string" },
                    },
                    required: ["id", "collection"],
                  },
                  data: {
                    type: "object",
                    description: "Arbitrary JSON data payload",
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Up to 50 keyword tags",
                  },
                },
                required: ["name", "source", "data"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Document created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/StoreDocument" },
                  },
                },
              },
            },
          },
          400: { description: "Bad request" },
          401: { description: "Unauthorized" },
          404: { description: "Store not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/store/{storeId}/documents/{id}": {
      put: {
        tags: ["Stores"],
        summary: "Update a store document",
        operationId: "updateStoreDocument",
        parameters: [
          {
            name: "storeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Document ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  source: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      collection: { type: "string" },
                    },
                  },
                  data: {
                    type: "object",
                    description: "Updated JSON data (triggers re-enrichment)",
                  },
                  keywords: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Document updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/StoreDocument" },
                  },
                },
              },
            },
          },
          400: { description: "Bad request" },
          401: { description: "Unauthorized" },
          404: { description: "Document not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/store": {
      post: {
        tags: ["Stores"],
        summary: "Create a store",
        operationId: "createStore",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  source: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      collection: { type: "string" },
                    },
                    required: ["id", "collection"],
                  },
                },
                required: ["name", "source"],
              },
            },
          },
        },
        responses: {
          201: { description: "Store created" },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/store/{storeId}": {
      put: {
        tags: ["Stores"],
        summary: "Update a store",
        operationId: "updateStore",
        parameters: [
          {
            name: "storeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  source: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      collection: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Store updated" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
      delete: {
        tags: ["Stores"],
        summary: "Delete a store",
        operationId: "deleteStore",
        parameters: [
          {
            name: "storeId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Store deleted" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/query": {
      post: {
        tags: ["Query"],
        summary: "Query stores",
        operationId: "queryStores",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  storeIds: {
                    type: "array",
                    items: { type: "string" },
                  },
                  query: { type: "string" },
                  limit: { type: "integer" },
                },
                required: ["storeIds", "query"],
              },
            },
          },
        },
        responses: {
          200: { description: "Query results" },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/memories": {
      post: {
        tags: ["Memories"],
        summary: "Create a memory",
        operationId: "createMemory",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                    description: "Optional description",
                  },
                  documentCapacity: {
                    type: "integer",
                    description: "Max documents (default 100)",
                  },
                  condenseThresholdPercent: {
                    type: "integer",
                    description: "Condensation threshold 1-100 (default 50)",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Memory created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    memory: { $ref: "#/components/schemas/Memory" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/memories/{memoryId}": {
      get: {
        tags: ["Memories"],
        summary: "Get memory details",
        operationId: "getMemory",
        parameters: [
          {
            name: "memoryId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Memory ID",
          },
        ],
        responses: {
          200: {
            description: "Memory details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    memory: { $ref: "#/components/schemas/Memory" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Not found" },
          500: { description: "Server error" },
        },
      },
      post: {
        tags: ["Memories"],
        summary: "Add a document to a memory",
        operationId: "addMemoryDocumentLegacy",
        parameters: [
          {
            name: "memoryId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Memory ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "Document content (max 50,000 chars)",
                  },
                  title: { type: "string", description: "Optional title hint" },
                },
                required: ["content"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Document created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/MemoryDocument" },
                  },
                },
              },
            },
          },
          400: { description: "Bad request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/memories/{memoryId}/documents": {
      get: {
        tags: ["Memories"],
        summary: "List memory documents",
        operationId: "getMemoryDocuments",
        parameters: [
          {
            name: "memoryId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Memory ID",
          },
        ],
        responses: {
          200: {
            description: "Memory documents",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MemoryDocument" },
                    },
                    hasNext: { type: "boolean" },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
      post: {
        tags: ["Memories"],
        summary: "Add a document to a memory",
        operationId: "addMemoryDocument",
        parameters: [
          {
            name: "memoryId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Memory ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "Document content (max 50,000 chars)",
                  },
                  title: { type: "string", description: "Optional title hint" },
                },
                required: ["content"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Document created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    document: { $ref: "#/components/schemas/MemoryDocument" },
                  },
                },
              },
            },
          },
          400: { description: "Bad request" },
          401: { description: "Unauthorized" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/file/upload": {
      post: {
        tags: ["Files"],
        summary: "Upload a file",
        operationId: "uploadFile",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                },
                required: ["file"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "File uploaded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FileUploadResponse" },
              },
            },
          },
          400: { description: "Invalid request" },
          401: { description: "Unauthorized" },
          413: { description: "File too large (50 MB limit)" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/file/{fileId}/download": {
      get: {
        tags: ["Files"],
        summary: "Generate a signed download URL",
        operationId: "downloadFile",
        parameters: [
          {
            name: "fileId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "File ID",
          },
        ],
        responses: {
          200: {
            description: "Signed download URL (15-minute expiry)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FileDownloadResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "File not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/file/{fileId}/thumbnail": {
      get: {
        tags: ["Files"],
        summary: "Get file thumbnail or fallback icon",
        operationId: "getFileThumbnail",
        parameters: [
          {
            name: "fileId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "File ID",
          },
        ],
        responses: {
          200: {
            description: "Thumbnail URL (images) or base64 icon (other types)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FileThumbnailResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "File not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/file/{fileId}": {
      delete: {
        tags: ["Files"],
        summary: "Delete a file",
        operationId: "deleteFile",
        parameters: [
          {
            name: "fileId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "File ID",
          },
        ],
        responses: {
          200: {
            description: "File deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FileDeleteResponse" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "File not found" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/auth/magic-link": {
      post: {
        tags: ["Authentication"],
        summary:
          "Send magic link to email for organization member authentication",
        description:
          "Sends a magic link to the provided email address. Requires reCAPTCHA validation. Organization ID is extracted from the API key.",
        operationId: "sendMagicLink",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    description: "User email address",
                  },
                  captchaToken: {
                    type: "string",
                    description: "Optional reCAPTCHA v3 token",
                  },
                },
                required: ["email"],
              },
            },
          },
        },
        security: [{ apiKey: [] }],
        responses: {
          200: {
            description: "Magic link sent successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request parameters" },
          401: { description: "Unauthorized - invalid API key" },
          403: { description: "reCAPTCHA verification failed" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/auth/callback": {
      post: {
        tags: ["Authentication"],
        summary: "Validate magic link and create session",
        description:
          "Validates the Firebase ID token from magic link and creates a session for the user. Organization ID is extracted from the API key.",
        operationId: "authCallback",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  idToken: {
                    type: "string",
                    description: "Firebase ID token from magic link flow",
                  },
                },
                required: ["idToken"],
              },
            },
          },
        },
        security: [{ apiKey: [] }],
        responses: {
          200: {
            description: "Session created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    sessionCookie: { type: "string" },
                    user: {
                      type: "object",
                      properties: {
                        uid: { type: "string" },
                        email: { type: "string" },
                        orgId: { type: "string" },
                        role: {
                          type: "string",
                          enum: ["member", "admin", "owner"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request parameters" },
          401: {
            description: "Unauthorized - invalid API key or invalid ID token",
          },
          403: { description: "Forbidden - membership removed" },
          404: { description: "User not a member of this organization" },
          500: { description: "Server error" },
        },
      },
    },
    "/api/v1/profile/me": {
      get: {
        tags: ["Profile"],
        summary: "Get user profile",
        description: "Retrieve the authenticated user's profile information",
        operationId: "getUserProfile",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Bearer token (Firebase ID token)",
            example: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI...",
          },
        ],
        security: [{ userToken: [] }],
        responses: {
          200: {
            description: "User profile retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - missing or invalid token" },
          404: { description: "User profile not found" },
          500: { description: "Server error" },
        },
      },
      post: {
        tags: ["Profile"],
        summary: "Update user profile",
        description: "Update the authenticated user's profile information",
        operationId: "updateUserProfile",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Bearer token (Firebase ID token)",
            example: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI...",
          },
        ],
        security: [{ userToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  displayName: {
                    type: "string",
                    description: "User's display name",
                  },
                  photoURL: {
                    type: "string",
                    format: "uri",
                    description: "User's photo URL",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid request parameters" },
          401: { description: "Unauthorized - missing or invalid token" },
          500: { description: "Server error" },
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Delete user account",
        description:
          "Delete the authenticated user's account and associated organization data. Account deletion is scheduled and will be processed asynchronously.",
        operationId: "deleteUserAccount",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Bearer token (Firebase ID token)",
            example: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI...",
          },
        ],
        security: [{ userToken: [] }],
        responses: {
          200: {
            description: "Account scheduled for deletion",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - missing or invalid token" },
          500: { description: "Server error" },
        },
      },
    },
  },
};
