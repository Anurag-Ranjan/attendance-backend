import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import { router } from "./routes/index.js";
import { globalErrorHandler } from "./middlewares/error.middleware.js";

// Initialize Express app ONCE
const app = express();

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins (for development)
    methods: ["GET", "POST", "PUT", "DELETE"], // Explicitly allow methods
    allowedHeaders: ["Content-Type", "Authorization"], // Explicitly allow headers
    optionsSuccessStatus: 204, // Handle preflight requests
  })
);

// Body parsers (remove redundant ones)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files (if needed)
app.use(express.static("public"));
// Routes
app.use("/api/v1", router);
app.set("host", "0.0.0.0");
app.use(globalErrorHandler);

// Export the app
export { app };
