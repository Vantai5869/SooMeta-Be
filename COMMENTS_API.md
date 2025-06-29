# Comments API Documentation

## Overview
The Comments API provides functionality to manage comments for exams, including creating, reading, liking, and deleting comments. It also supports nested replies to comments. The API uses JWT authentication for protected endpoints.

## Base URL
```
http://localhost:3000/api/comments
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Data Models

### Comment Model
```javascript
{
  _id: ObjectId,
  examId: String (required),
  userId: ObjectId (required, automatically set from authenticated user),
  userName: String (required, automatically set from authenticated user),
  userAvatar: String (optional, automatically set from authenticated user),
  content: String (required, max 1000 chars),
  parentId: ObjectId (optional, null for top-level comments),
  createdAt: Date (default: now),
  updatedAt: Date (default: now),
  likes: Number (default: 0),
  likedBy: [ObjectId], // Array of user IDs who liked
  replyCount: Number (default: 0) // Number of replies to this comment
}
```

## API Endpoints

### 1. Get Comments
**GET** `/api/comments`

Retrieve top-level comments for a specific exam with pagination and sorting options. Replies are included in the response.

#### Query Parameters
- `examId` (required): The ID of the exam
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of comments per page (default: 10)
- `sort` (optional): Sorting option - `newest`, `oldest`, `mostLiked` (default: `newest`)

#### Authentication
- **Required**: No (but `isLiked` field will be included if authenticated)

#### Example Request
```bash
GET /api/comments?examId=exam123&page=1&limit=10&sort=newest
Authorization: Bearer <your_jwt_token>
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "examId": "exam123",
        "userId": "507f1f77bcf86cd799439011",
        "userName": "john@example.com",
        "userAvatar": "https://example.com/avatar.jpg",
        "content": "Great exam!",
        "parentId": null,
        "likes": 5,
        "likedBy": ["507f1f77bcf86cd799439011"],
        "replyCount": 2,
        "isLiked": true,
        "replies": [
          {
            "_id": "507f1f77bcf86cd799439013",
            "examId": "exam123",
            "userId": "507f1f77bcf86cd799439014",
            "userName": "jane@example.com",
            "content": "I agree!",
            "parentId": "507f1f77bcf86cd799439012",
            "likes": 1,
            "likedBy": ["507f1f77bcf86cd799439014"],
            "isLiked": false,
            "createdAt": "2025-01-15T10:35:00.000Z",
            "updatedAt": "2025-01-15T10:35:00.000Z"
          }
        ],
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalComments": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "message": "Comments retrieved successfully"
}
```

### 2. Get Replies for a Comment
**GET** `/api/comments/:commentId/replies`

Retrieve replies for a specific comment with pagination.

#### Query Parameters
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of replies per page (default: 10)

#### Authentication
- **Required**: No (but `isLiked` field will be included if authenticated)

#### Example Request
```bash
GET /api/comments/507f1f77bcf86cd799439012/replies?page=1&limit=10
Authorization: Bearer <your_jwt_token>
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "replies": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "examId": "exam123",
        "userId": "507f1f77bcf86cd799439014",
        "userName": "jane@example.com",
        "content": "I agree!",
        "parentId": "507f1f77bcf86cd799439012",
        "likes": 1,
        "likedBy": ["507f1f77bcf86cd799439014"],
        "isLiked": false,
        "createdAt": "2025-01-15T10:35:00.000Z",
        "updatedAt": "2025-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalReplies": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "message": "Replies retrieved successfully"
}
```

### 3. Create Comment or Reply
**POST** `/api/comments`

Create a new comment or reply for an exam.

#### Request Body
```json
{
  "examId": "exam123",
  "content": "This is a great exam!",
  "parentId": "507f1f77bcf86cd799439012" // Optional: include to create a reply
}
```

#### Required Fields
- `examId`: String
- `content`: String (max 1000 characters)

#### Optional Fields
- `parentId`: ObjectId (if provided, creates a reply to the specified comment)

#### Authentication
- **Required**: Yes

#### Example Request
```bash
POST /api/comments
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "examId": "exam123",
  "content": "This is a great exam!"
}
```

#### Example Response (Top-level Comment)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "examId": "exam123",
    "userId": "507f1f77bcf86cd799439011",
    "userName": "john@example.com",
    "userAvatar": "https://example.com/avatar.jpg",
    "content": "This is a great exam!",
    "parentId": null,
    "likes": 0,
    "likedBy": [],
    "replyCount": 0,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Comment created successfully"
}
```

#### Example Response (Reply)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "examId": "exam123",
    "userId": "507f1f77bcf86cd799439014",
    "userName": "jane@example.com",
    "content": "I agree!",
    "parentId": "507f1f77bcf86cd799439012",
    "likes": 0,
    "likedBy": [],
    "replyCount": 0,
    "createdAt": "2025-01-15T10:35:00.000Z",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  },
  "message": "Reply created successfully"
}
```

### 4. Toggle Like
**POST** `/api/comments/:commentId/like`

Like or unlike a comment or reply.

#### Request Body
```json
{} // No body required
```

#### Authentication
- **Required**: Yes

#### Example Request
```bash
POST /api/comments/507f1f77bcf86cd799439012/like
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "comment": {
      "_id": "507f1f77bcf86cd799439012",
      "likes": 1,
      "likedBy": ["507f1f77bcf86cd799439011"]
    },
    "isLiked": true
  },
  "message": "Comment liked successfully"
}
```

### 5. Delete Comment or Reply
**DELETE** `/api/comments/:commentId`

Delete a comment or reply (only by the creator or admin).

#### Request Body
```json
{} // No body required
```

#### Authentication
- **Required**: Yes
- **Authorization**: Must be comment creator or admin

#### Example Request
```bash
DELETE /api/comments/507f1f77bcf86cd799439012
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{}
```

#### Example Response
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `MISSING_EXAM_ID`: examId is required
- `MISSING_REQUIRED_FIELDS`: Required fields are missing
- `EMPTY_CONTENT`: Content cannot be empty
- `CONTENT_TOO_LONG`: Content exceeds 1000 characters
- `COMMENT_NOT_FOUND`: Comment not found
- `PARENT_COMMENT_NOT_FOUND`: Parent comment not found (for replies)
- `UNAUTHORIZED_DELETE`: Only comment creator or admin can delete
- `MISSING_COMMENT_ID`: Comment ID is required
- `INTERNAL_ERROR`: Server error

### Authentication Error Codes
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Insufficient permissions

## Usage Examples

### JavaScript/Node.js
```javascript
// Get comments (no auth required, but isLiked will be included if authenticated)
const response = await fetch('/api/comments?examId=exam123&page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer your_jwt_token_here'
  }
});
const data = await response.json();

// Create top-level comment
const newComment = await fetch('/api/comments', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token_here'
  },
  body: JSON.stringify({
    examId: 'exam123',
    content: 'Great exam!'
  })
});

// Create reply to a comment
const newReply = await fetch('/api/comments', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token_here'
  },
  body: JSON.stringify({
    examId: 'exam123',
    content: 'I agree!',
    parentId: '507f1f77bcf86cd799439012'
  })
});

// Get replies for a specific comment
const replies = await fetch('/api/comments/507f1f77bcf86cd799439012/replies?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer your_jwt_token_here'
  }
});

// Like a comment
const likeResponse = await fetch('/api/comments/507f1f77bcf86cd799439012/like', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token_here'
  },
  body: JSON.stringify({})
});
```

### cURL
```bash
# Get comments (no auth required)
curl "http://localhost:3000/api/comments?examId=exam123&page=1&limit=10"

# Get comments with auth (includes isLiked field)
curl "http://localhost:3000/api/comments?examId=exam123&page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token_here"

# Create top-level comment
curl -X POST "http://localhost:3000/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token_here" \
  -d '{"examId":"exam123","content":"Great exam!"}'

# Create reply
curl -X POST "http://localhost:3000/api/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token_here" \
  -d '{"examId":"exam123","content":"I agree!","parentId":"507f1f77bcf86cd799439012"}'

# Get replies
curl "http://localhost:3000/api/comments/507f1f77bcf86cd799439012/replies?page=1&limit=10" \
  -H "Authorization: Bearer your_jwt_token_here"

# Like comment
curl -X POST "http://localhost:3000/api/comments/507f1f77bcf86cd799439012/like" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token_here" \
  -d '{}'

# Delete comment (only creator or admin)
curl -X DELETE "http://localhost:3000/api/comments/507f1f77bcf86cd799439012" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token_here" \
  -d '{}'
```

## Authentication & Authorization

### Authentication Requirements
- **No Auth Required**: GET requests (comments and replies)
- **Auth Required**: POST requests (create comments/replies, like/unlike)
- **Auth + Authorization Required**: DELETE requests (only creator or admin)

### Authorization Rules
- **Comment Creator**: Can delete their own comments and replies
- **Admin**: Can delete any comment or reply
- **Other Users**: Cannot delete comments they didn't create

### Getting JWT Token
To get a JWT token, use your existing authentication endpoint:
```bash
POST /users/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Notes
- All timestamps are in ISO 8601 format
- ObjectId fields should be valid MongoDB ObjectId strings
- The `isLiked` field is only included in GET responses when user is authenticated
- Pagination is 1-based (page 1 is the first page)
- Comments are automatically sorted by creation date unless specified otherwise
- When deleting a top-level comment, all its replies are automatically deleted
- When deleting a reply, the parent comment's `replyCount` is automatically updated
- Replies are sorted by creation date (oldest first) for better readability
- The `replyCount` field is automatically maintained when creating/deleting replies
- User information (userId, userName, userAvatar) is automatically set from the authenticated user 