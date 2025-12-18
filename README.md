# URLS

A robust URL shortening service (URLS) built with Node.js, Express, and MongoDB.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xyberty/urls.git
cd urls
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DB_URL=mongodb://localhost:27017/urlshortener
LOG_LEVEL=info
```

4. Start the server:

```bash
npm start
```

## Docker Setup

### Prerequisites
- Docker
- Docker Compose

### Running with Docker Compose

The easiest way to run the application with Docker is using Docker Compose, which will set up both the application and MongoDB:

1. Build and start the containers:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker-compose logs -f app
```

3. Stop the containers:
```bash
docker-compose down
```

4. Stop and remove volumes (this will delete MongoDB data):
```bash
docker-compose down -v
```

The application will be available at `http://localhost:3000`.

### Environment Variables for Docker

You can customize the Docker setup by setting environment variables:

- `SESSION_SECRET`: Secret key for session management (default: `change-this-secret-in-production`)
- `PORT`: Application port (default: `3000`)
- `DB_URL`: MongoDB connection string (default: `mongodb://mongo:27017/urlshortener`)
- `DB_NAME`: Database name (default: `urlshortener`)

You can set these in a `.env` file or directly in `docker-compose.yml`.

### Building Docker Image Manually

To build the Docker image without Docker Compose:

```bash
docker build -t urls-app .
```

To run the container:

```bash
docker run -p 3000:3000 \
  -e DB_URL=mongodb://your-mongo-host:27017/urlshortener \
  -e SESSION_SECRET=your-secret-key \
  urls-app
```

**Note:** When running manually, ensure MongoDB is accessible from the container or use the file storage fallback.

## API Documentation

### Endpoints

#### Create Short URL

- **POST** `/shortUrls`
  - Body: 
    - `fullUrl` (required): Original URL to shorten
    - `customSuffix` (optional): Custom alias for the URL
  - Response: Redirects to homepage with new short URL

#### Access Short URL

- **GET** `/:shortUrl`
  - Params: 
    - `shortUrl`: Short URL or custom alias
  - Response: Redirects to original URL

#### Health Check

- **GET** `/health`
  - Response: Basic health status
- **GET** `/health/detailed`
  - Response: Detailed health information

## Environment Variables

- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port
- `DB_URL`: MongoDB connection string
- `LOG_LEVEL`: Logging level (error/warn/info/debug)

## Scripts

- `npm start`: Start the server
- `npm test`: Run tests
- `npm run dev`: Start with nodemon for development

## Project Structure

project-root/
├── config/
│ └── config.js # Environment configurations
├── middleware/
│ ├── rateLimiter.js # Rate limiting configuration
│ └── urlValidator.js # URL validation middleware
├── utils/
│ ├── errorHandler.js # Centralized error handling
│ ├── logger.js # Winston logger configuration
│ └── monitoring.js # Application monitoring
├── tests/
│ └── shortUrl.test.js # Unit tests
├── jest.config.js # Jest testing configuration
├── server.js # Main application file
└── shortUrl.js # URL model definition

## Monitoring and Error Handling

The application includes built-in monitoring and error handling:
- Memory usage monitoring (logs every 5 minutes)
- Unhandled rejection tracking
- Uncaught exception handling
- Structured error responses
- Production/Development specific error details

## Testing

Run the test suite:
```bash
npm test
```

To run tests with coverage report:
```bash
npm test -- --coverage
```

## Error Responses

The API returns structured error responses:

### Development Mode
```json
{
  "status": "error",
  "error": {...},
  "message": "Error description",
  "stack": "Error stack trace"
}
```

### Production Mode
```json
{
  "status": "error",
  "message": "User-friendly error message"
}
```

## Rate Limiting

The API implements rate limiting with the following defaults:
- Development: 100 requests per 15 minutes
- Production: 50 requests per 15 minutes

## Monitoring

The application logs important metrics:
- Memory usage
- Unhandled rejections
- Uncaught exceptions
- Database connection status
- Application errors

Logs are stored in:
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs