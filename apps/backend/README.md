# Chronos Backend

Hono-based API running on Cloudflare Workers with D1 database.

## Project Structure

```
apps/backend/
├── src/
│   ├── db/
│   │   └── queries/          # Database queries (data layer)
│   │       └── users.ts      # User CRUD queries
│   ├── services/             # Business logic layer
│   │   └── user.service.ts   # User service with validation
│   ├── routes/               # HTTP route handlers
│   │   └── users.ts          # User API endpoints
│   ├── types/                # Backend-specific types
│   │   └── env.ts            # Cloudflare bindings
│   └── index.ts              # App entry point
├── migrations/               # D1 database migrations
│   └── 0001_create_users_table.sql
└── wrangler.toml             # Cloudflare Workers config
```

## Architecture Layers

### 1. Queries Layer (`src/db/queries/`)
- **Purpose**: Pure database operations, no business logic
- **Responsibilities**: SQL queries, data mapping, type conversion
- **Example**: `getAllUsers()`, `getUserById()`, `createUser()`
- **Naming**: Functions should be verb-based (get, create, update, delete)

### 2. Service Layer (`src/services/`)
- **Purpose**: Business logic and validation
- **Responsibilities**: Input validation, business rules, calling queries
- **Example**: Email validation, duplicate checks, complex operations
- **Naming**: Classes ending with `Service` (e.g., `UserService`)

### 3. Route Layer (`src/routes/`)
- **Purpose**: HTTP request/response handling
- **Responsibilities**: Request parsing, response formatting, error handling
- **Example**: Parse JSON, call service, return ApiResponse format
- **Naming**: Files match resource name (e.g., `users.ts` for `/api/users`)

## API Endpoints

### Users API (`/api/users`)

| Method | Endpoint          | Description       | Request Body                | Response           |
|--------|-------------------|-------------------|-----------------------------|--------------------|
| GET    | `/api/users`      | Get all users     | -                           | `ApiResponse<User[]>` |
| GET    | `/api/users/:id`  | Get user by ID    | -                           | `ApiResponse<User>` |
| POST   | `/api/users`      | Create new user   | `{ email, name }`           | `ApiResponse<User>` |
| PUT    | `/api/users/:id`  | Update user       | `{ email?, name? }`         | `ApiResponse<User>` |
| DELETE | `/api/users/:id`  | Delete user       | -                           | `ApiResponse<{id}>` |

### Response Format

All responses follow the `ApiResponse<T>` type from `@chronos/types`:

```typescript
{
  "data": T,
  "success": boolean,
  "message": string,
  "error"?: {
    "code": string,
    "message": string,
    "details"?: Record<string, unknown>
  }
}
```

## Development

### Setup
```bash
# Install dependencies
bun install

# Run migrations locally
bun wrangler d1 execute chronos-database-development --local --file=./migrations/0001_create_users_table.sql
```

### Running
```bash
# Development mode with hot reload
bun dev

# Or from root
bun --filter @chronos/backend dev
```

### Testing API
```bash
# Health check
curl http://localhost:3000/

# Get all users
curl http://localhost:3000/api/users

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John Doe"}'

# Get user by ID
curl http://localhost:3000/api/users/{id}

# Update user
curl -X PUT http://localhost:3000/api/users/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe"}'

# Delete user
curl -X DELETE http://localhost:3000/api/users/{id}
```

## Adding New Resources

### Example: Adding a "Posts" resource

1. **Create queries** (`src/db/queries/posts.ts`):
```typescript
export async function getAllPosts(db: D1Database): Promise<Post[]> {
  // SQL queries here
}
```

2. **Create service** (`src/services/post.service.ts`):
```typescript
export class PostService {
  constructor(private db: D1Database) {}
  
  async getAllPosts(): Promise<Post[]> {
    // Business logic + call queries
  }
}
```

3. **Create routes** (`src/routes/posts.ts`):
```typescript
const posts = new Hono<{ Bindings: Env }>();

posts.get("/", async (c) => {
  const postService = new PostService(c.env.DB);
  // Handle request/response
});

export default posts;
```

4. **Register routes** (`src/index.ts`):
```typescript
import posts from "./routes/posts";
app.route("/api/posts", posts);
```

5. **Create types** (in `@chronos/types` package):
```typescript
// packages/types/src/post.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  // ...
}
```

6. **Create migration**:
```sql
-- migrations/0002_create_posts_table.sql
CREATE TABLE posts (...);
```

## Database

### D1 Configuration

Three environments configured in `wrangler.toml`:
- **Development**: `chronos-database-development` (local + remote)
- **Preview**: `chronos-database-preview`
- **Production**: `chronos-database`

### Migration Workflow

1. Create migration file: `migrations/NNNN_description.sql`
2. Test locally: `wrangler d1 execute DB_NAME --local --file=./migrations/NNNN_description.sql`
3. Apply to dev: `wrangler d1 execute DB_NAME --remote --file=./migrations/NNNN_description.sql`
4. Deploy to production after testing

See `migrations/README.md` for detailed migration instructions.

## Type Safety

### Cloudflare Bindings
Environment bindings are typed in `src/types/env.ts`:
```typescript
export interface Env {
  DB: D1Database;
}
```

### Shared Types
Import from `@chronos/types` package:
```typescript
import type { User } from "@chronos/types/user";
import type { ApiResponse } from "@chronos/types/api";
import type { D1Database } from "@chronos/types/database";
```

## Deployment

```bash
# Deploy to Cloudflare Workers
bun deploy

# Or from root
bun --filter @chronos/backend deploy
```

## Best Practices

1. **Separation of Concerns**: Keep queries, business logic, and routes separate
2. **Type Safety**: Always use types from `@chronos/types` for shared contracts
3. **Error Handling**: Return consistent `ApiResponse` format with proper status codes
4. **Validation**: Validate input in service layer before database operations
5. **Database Mapping**: Convert snake_case DB columns to camelCase TypeScript
6. **Async/Await**: Use async/await for all database operations
7. **Prepared Statements**: Always use parameterized queries to prevent SQL injection

## Common Patterns

### Database Row Mapping
```typescript
interface UserRow {
  id: string;
  email: string;
  created_at: string; // DB uses snake_case
}

function mapUserRowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at), // Convert to camelCase + Date
  };
}
```

### Error Response
```typescript
const errorResponse: ApiResponse<null> & { error: ApiError } = {
  data: null,
  success: false,
  message: "User not found",
  error: {
    code: "USER_NOT_FOUND",
    message: `User with id ${id} does not exist`,
  },
};

return c.json(errorResponse, 404);
```

### Service Pattern
```typescript
export class ResourceService {
  constructor(private db: D1Database) {}
  
  async getAll(): Promise<Resource[]> {
    // Business logic
    return resourceQueries.getAll(this.db);
  }
}
```
