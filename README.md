# Small Web

Next.js + NestJS + MongoDB + TypeScript. Requires Node 20+ and a MongoDB database (local or Atlas).

## Server
```
cd server
npm install
copy .env.example .env      (macOS/Linux: cp .env.example .env)
```
Edit `server/.env` and set `MONGO_URI` to your database. Then:
```
npm run seed
npm run start:dev
```
API: http://localhost:4000

## Client
```
cd client
npm install
copy .env.example .env.local      (macOS/Linux: cp .env.example .env.local)
npm run dev
```
App: http://localhost:3000

## Tests
```
cd client
npm test
```