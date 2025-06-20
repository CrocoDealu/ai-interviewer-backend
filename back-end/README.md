# InterviewAI Backend

A Node.js REST API backend for the InterviewAI application.

## Features

- **Authentication**: JWT-based authentication with signup/login
- **Interview Management**: Create, manage, and track interview sessions
- **AI Integration**: OpenRouter API integration for AI responses
- **User Management**: User profiles and statistics
- **Security**: Rate limiting, CORS, input validation, and security headers

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

### Interviews
- `POST /api/interviews/start` - Start new interview session
- `GET /api/interviews/:id` - Get interview details
- `POST /api/interviews/:id/messages` - Add message to interview
- `POST /api/interviews/:id/end` - End interview session
- `GET /api/interviews` - Get user's interviews (authenticated)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user statistics

### Health Check
- `GET /health` - Server health status

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. **Required Environment Variables:**
   - `JWT_SECRET` - Secret key for JWT tokens
   - `OPENROUTER_API_KEY` - OpenRouter API key for AI responses
   - `PORT` - Server port (default: 3001)
   - `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

4. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **Input Validation**: Request validation using express-validator
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds

## Data Storage

Currently uses in-memory storage for development. In production, replace with:
- Database (PostgreSQL, MongoDB, etc.)
- Redis for session storage
- File storage for interview transcripts

## API Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "details": [ ... ] // Optional validation details
}
```

## Development

- Uses ES modules (`"type": "module"`)
- Nodemon for development auto-restart
- Morgan for request logging
- Express.js framework

## Production Considerations

1. **Database**: Replace in-memory storage with persistent database
2. **Caching**: Add Redis for session and response caching
3. **Logging**: Implement proper logging (Winston, etc.)
4. **Monitoring**: Add health checks and monitoring
5. **Deployment**: Use PM2 or similar for process management
6. **SSL**: Enable HTTPS in production
7. **Environment**: Use proper environment management