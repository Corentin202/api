import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { config } from 'dotenv';

config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use('/api', apiRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});