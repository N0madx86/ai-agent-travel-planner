const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the frontend build directory
// In a full monorepo setup, you'd build the frontend into ../frontend/dist
const frontendDistPath = path.join(__dirname, '../frontend/dist');

// Serve static files from the frontend react build
app.use(express.static(frontendDistPath));

// API endpoint placeholder - if you want Node to handle some requests instead of Python
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Node.js Express' });
});

// All other GET requests not handled will return the React app (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${frontendDistPath}`);
});
