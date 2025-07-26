# Chatbot Service - Modular Component for Large Applications

A complete, production-ready chatbot solution designed as a modular component for integration into larger applications. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## 🚀 Features

### Backend (FastAPI)

- **Multi-LLM Support**: LM Studio, Azure OpenAI, and extensible architecture
- **Profile Management**: Customizable chatbot personalities with system instructions
- **Session Management**: Persistent chat history and conversation tracking
- **Authentication**: JWT-based user authentication and authorization
- **Database**: SQLAlchemy ORM with PostgreSQL/SQLite support
- **API Documentation**: Automatic OpenAPI/Swagger documentation
- **Monitoring**: Prometheus metrics and structured logging
- **Testing**: Comprehensive unit and integration tests

### Frontend (React)

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **TypeScript**: Full type safety and IntelliSense support
- **Component Library**: Modular, reusable React components
- **Theme Support**: Light, dark, and auto themes
- **Real-time Updates**: WebSocket support for live messaging
- **Session Management**: Chat history and session switching
- **Profile Switching**: Dynamic personality switching
- **Mobile Responsive**: Optimized for all screen sizes

## 📁 Project Structure

```
AW_POC/
├── chatbot-service/           # Backend microservice
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration management
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic
│   │   ├── routers/          # API endpoints
│   │   ├── database/         # Database setup
│   │   └── core/             # Core utilities
│   ├── requirements.txt      # Python dependencies
│   └── README.md

├── chatbot-interface.html     # Frontend interface
├── chatbot-demo.html          # Demo interface
└── README.md
```

## 🛠️ Quick Start

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd chatbot-service
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**

   ```bash
   # Create .env file
   cp .env.example .env

   # Edit .env with your settings
   LLM_LM_STUDIO_URL=http://localhost:1234
   SECURITY_SECRET_KEY=your-secret-key
   ```

4. **Run the service:**

   ```bash
   python -m uvicorn app.main:app --reload
   ```

5. **Access the API:**
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/api/v1/health

### Frontend Setup

The frontend is a simple HTML/JavaScript interface for testing:

1. **Open the interface:**

   ```bash
   open chatbot-interface.html
   ```

2. **Or serve it with a local server:**

   ```bash
   python -m http.server 3000
   ```

3. **Access the interface:**
   - URL: http://localhost:3000/chatbot-interface.html

## 🔧 Configuration

### Backend Configuration

The backend uses environment-based configuration:

```bash
# Database
DB_URL=sqlite:///./chatbot.db
DB_ECHO=false

# LLM Providers
LLM_LM_STUDIO_URL=http://localhost:1234
LLM_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
LLM_AZURE_OPENAI_API_KEY=your-key

# Security
SECURITY_SECRET_KEY=your-secret-key
SECURITY_CORS_ORIGINS=["http://localhost:3000"]

# Service
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
SERVICE_DEBUG=true
```

### Frontend Integration

The project includes a simple HTML/JavaScript interface for testing:

```html
<!-- chatbot-interface.html -->
<script>
  const apiEndpoint = "http://localhost:8000";

  async function sendMessage(message) {
    const response = await fetch(`${apiEndpoint}/api/v1/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, profile: "default" }),
    });
    return response.json();
  }
</script>
```

## 🔌 API Endpoints

### Authentication

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Chat

- `POST /api/v1/chat/send` - Send message
- `GET /api/v1/chat/sessions` - Get sessions
- `GET /api/v1/chat/history/{session_id}` - Get chat history
- `DELETE /api/v1/chat/sessions/{session_id}` - Delete session

### Profiles

- `GET /api/v1/profiles` - Get profiles
- `POST /api/v1/profiles` - Create profile
- `PUT /api/v1/profiles/{id}` - Update profile
- `DELETE /api/v1/profiles/{id}` - Delete profile

### Health

- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Service status
- `GET /metrics` - Prometheus metrics

## 🧪 Testing

### Backend Tests

```bash
cd chatbot-service
pytest
pytest --cov=app
```

### Frontend Tests

The frontend is a simple HTML interface that can be tested manually by opening `chatbot-interface.html` in a browser.

## 🚀 Deployment

### Local Development

1. **Start AgentWatch:**

   ```bash
   cd agentwatch
   npm install
   npm run build
   npm start
   ```

2. **Start Chatbot Service:**

   ```bash
   cd chatbot-service
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Start LM Studio:**
   - Open LM Studio application
   - Load a model
   - Ensure it's running on port 1234

### Production Considerations

- Use PostgreSQL instead of SQLite
- Set up Redis for caching
- Configure proper CORS origins
- Use environment-specific settings
- Set up monitoring and logging
- Implement rate limiting
- Use HTTPS in production

## 🔒 Security

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- Rate limiting
- SQL injection protection

## 📊 Monitoring

- Prometheus metrics
- Structured logging with structlog
- Health check endpoints
- Performance monitoring
- Error tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review the API docs at `/docs`

## 🔮 Roadmap

- [ ] WebSocket support for real-time messaging
- [ ] File upload and attachment support
- [ ] Advanced analytics and insights
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Advanced LLM provider integrations
- [ ] Plugin system for custom functionality
