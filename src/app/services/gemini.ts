/// <reference types="vite/client" />
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
