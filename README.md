
![Logo](https://media-hosting.imagekit.io/d49194fcf0eb4957/CyanVote2.png?Expires=1841333155&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=WL3bz~LG4hqqI~7RHWMKe90FkdUt95c6Qwq1~ISeFeSMdI0FXiWRf3QKSlj1R-y6CxRr-YS91KG15b9kSEg5jaWVnPQ6QrcG97h1A5112IEtGXZGmqPy8F4uAMJC-~FqXUFAvk7qZGyn7gj7uOYJri-KwAAvAyI-NXspvgp3Iq8vyP3I46ejgD2fvQ031cBb39eG8jSK7TnixtRhHBX3xyZIFf~NkOyM-OzBeVCXc8~Ftxreu-6f5eFXiIouGw05wplQI9nBqEhgVtzlCiaotzT1ewZZqw65DniW5haArslPjGHK4B2KRnG6O~Kz8vqiu3lG9BqIRnWhZtU45F~YOQ__)


# Cyan Vote

A Self Tallying Score based voting project with Blockchain.


## Features

- Face recognition and enrollment
- Blockchain-based voting system
- User authentication and authorization
- File upload capabilities
- Session management
- RESTful API architecture


## Tech Stack

### 1. Frontend: ###

**Core Technologies:**
React 19
, TypeScript
, Vite (Build tool)
, React Router DOM 7

**UI/Styling:**
Styled Components
, CSS Modules

**Face Recognition:**
face-api.js (for face detection and recognition)

**HTTP Client:**
Axios

### 2.Backend: ###

**Core Technologies:**
Node.js
, Express.js
, TypeScript

**Database:**
SQLite3
, connect-sqlite3 (Session store)

**Authentication & Security:**
bcrypt (Password hashing)
, express-session (Session management)
, CORS

**File Handling:**
Multer (File uploads)

**Blockchain Integration:**
ethers.js (Ethereum interaction)

### 3.Smart Contracts ###
**Core Technologies:**
Solidity
, Hardhat (Development environment)
, ethers.js

**Testing:**
Hardhat testing framework

### 4. Development Tools ###
**Type Checking:**
TypeScript
, ESLint

**Development Environment:**
Nodemon (Backend auto-reload)
, Vite (Frontend development server)

**Testing:**
Jest
, ts-jest
## Environment Variables

To run this project, you will need to update the following environment variables to your .env file in/backend .

`GANACHE_RPC_URL=http://127.0.0.1:8545`

`CONTRACT_ADDRESS=0xxxxxxxxxxxxxxxxxxxx`

`SIGNER_PRIVATE_KEY=0xxxxxxxxxxxxxxxxxx`

`INITIAL_ADMIN_USER=Aussiepink`

`INITIAL_ADMIN_PASS=blink`

`INITIAL_ADMIN_NAME=Rosie`

Update the CONTRACT_ADDRESS & SIGNER_PRIVATE_KEY from backend,contracts terminal once after the deployment successful.

## Run locally

To run this project locally
install the required dependencies before running any commands on all stated directories.
```bash
npm install
```
common for backend,frontend & contracts directories.

### Backend
1. Open terminal in /backend

```bash
  npm run dev
```
If the backend/voting_app.db is not there, initially it will throw some sqlite errors. Ignore it and stop the server by ctrl+c.

2. Run the below command to initialize the initial admin credentials hardcoded on the .env file
```bash
  npm run create-admin
```
3. Start the backend server again
```bash
  npm run dev
```
Now the Server starts without any error on port 3001.

!!!! If Job Done, Stop the Server properly (ctrl+c)!!!!!

### Blockchain

1. Open terminal in /contracts
```bash
  npx hardhat clean
```
```bash
  npx hardhat run scripts/deploy.js --network ganache_or_localhost
```
```bash
  npx hardhat node
```
Ganache will run on port 8545.
### Frontend

1.Open terminal in /frontend

```bash
  npm run dev
```
Frontend vite run on port 5173.



## Appendix
**Face Detection Confidence Score :**

The face-api Minimum confidence score is set to 0.3 or 30%. We can modify it `minConfidence: 0.3` on the frontend/src/components/FaceEnrollment.tsx

**Addidng new admins :**

First register as normal user, then update the `users` table `is_admin` column for that specific user profile as `1`

e.g,
```bash
UPDATE users SET is_admin = 1 WHERE username=sanjayramsay;
```
### NOT OPTIMIZED FOR DARK MODE 🌚 ###

