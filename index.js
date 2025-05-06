import express from "express";
import dotenv from "dotenv";
import createDLHandler from "./api/create-dl.js";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/api/create-dl", createDLHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));