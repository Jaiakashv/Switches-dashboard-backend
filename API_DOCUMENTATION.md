# API & Frontend Integration Documentation

This document explains:
1. How the frontend calls the backend APIs.
2. Where the APIs are defined (routes, controllers, and database).
3. The details of all available API endpoints.
4. How to perform these requests in **Postman** (specifying required headers and body payloads).

---

## 1. How the Frontend Calls APIs

The frontend application (`Switches-dashboard`) uses **Axios** to communicate with the backend API. 

The configuration and central API wrapper are located at:
* **Axios Instance:** [src/api/index.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard/src/api/index.js)
* **Endpoints Mapping:**
  * [authApi.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard/src/api/authApi.js)
  * [switchApi.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard/src/api/switchApi.js)
  * [alertApi.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard/src/api/alertApi.js)
  * [analyticsApi.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard/src/api/analyticsApi.js)

### Token Authorization & Request Interceptor
The frontend automatically handles JWT authentication using an **Axios Request Interceptor** in `src/api/index.js`. 
1. When a user successfully logs in, the JWT token is saved to `localStorage` under the key `'auth_token'`.
2. For every outgoing HTTP request, the interceptor automatically reads the token from `localStorage` and appends it to the `Authorization` header:
   ```javascript
   config.headers.Authorization = `Bearer ${token}`
   ```
3. If the backend returns a `401 Unauthorized` status (e.g., token expired or invalid), a **Response Interceptor** clears the token and triggers an event to redirect the user to the login screen.

---

## 2. Where the APIs are Created

The backend (`Switches-dashboard-backend`) is built on **Node.js + Express** and uses **Redis** as its data store.
* **Entry Point:** [index.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard-backend/index.js)
* **Routes Folder:** [routes/](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard-backend/routes/)
* **Controllers Folder:** [controllers/](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard-backend/controllers/)
* **Database (Redis Configuration):** [config/redis.js](file:///c:/Users/acer/Desktop/switches-webapp/Switches-dashboard-backend/config/redis.js)

---

## 3. API Endpoints Details & Postman Configuration

The base URL for all endpoints is:
`http://localhost:3000/api`

### Global Postman Headers
For all requests sending JSON data (POST, PATCH, PUT):
* `Content-Type`: `application/json`

For **Protected** endpoints (marked below), you must include the token returned by the login/register endpoint:
* `Authorization`: `Bearer <YOUR_JWT_TOKEN>`

---

### A. Authentication Endpoints

#### 1. Register User
* **Method:** `POST`
* **URL:** `/auth/register`
* **Protected:** No
* **Description:** Creates a new administrator account and logs them in.
* **Request Body (JSON):**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": "e81e3a7c-474c-47bc-8f43-0599c27943c2",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "Admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 2. Login User
* **Method:** `POST`
* **URL:** `/auth/login`
* **Protected:** No
* **Description:** Logs in an existing user and returns a JWT token.
* **Request Body (JSON):**
  ```json
  {
    "email": "admin@network.local",
    "password": "admin123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "id": "c0be44f0-4fa2-430c-843e-7833075b95a8",
    "name": "Admin User",
    "email": "admin@network.local",
    "role": "Admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 3. Get Current User Details
* **Method:** `GET`
* **URL:** `/auth/me`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Retrieves details of the logged-in user from the token payload.
* **Success Response (200 OK):**
  ```json
  {
    "id": "c0be44f0-4fa2-430c-843e-7833075b95a8",
    "name": "Admin User",
    "email": "admin@network.local",
    "role": "Admin"
  }
  ```

#### 4. Change Password
* **Method:** `PATCH`
* **URL:** `/auth/password`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Changes the password of the authenticated user.
* **Request Body (JSON):**
  ```json
  {
    "currentPassword": "admin123",
    "newPassword": "newsecurepassword456"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "message": "Password updated successfully"
  }
  ```

---

### B. Switches Endpoints

#### 1. Fetch Switches (Paginated & Searchable)
* **Method:** `GET`
* **URL:** `/switches`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Gets a list of switches matching optional search and pagination parameters.
* **Query Parameters:**
  * `limit` (number, default: 10): items per page
  * `offset` (number, default: 0): number of items to skip
  * `search` (string, optional): search term matching Model or ID
* **Success Response (200 OK):**
  ```json
  {
    "data": [
      {
        "model": "Cisco Catalyst 9300",
        "physicalDevice": "Rack A-01",
        "id": "SW-1001",
        "config": "Core routing + VLAN trunking",
        "status": "Online"
      }
    ],
    "total": 6,
    "limit": 1,
    "offset": 0
  }
  ```

#### 2. Create Switch
* **Method:** `POST`
* **URL:** `/switches`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Registers a new switch. Enforces case-insensitive unique IDs.
* **Request Body (JSON):**
  ```json
  {
    "id": "SW-1008",
    "model": "Cisco Nexus 9000",
    "physicalDevice": "Rack E-02",
    "config": "Spine-leaf fabric link",
    "status": "Online"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": "SW-1008",
    "model": "Cisco Nexus 9000",
    "physicalDevice": "Rack E-02",
    "config": "Spine-leaf fabric link",
    "status": "Online"
  }
  ```
* **Error Response (409 Conflict - Duplicate ID):**
  ```json
  {
    "message": "A switch with this ID already exists."
  }
  ```

#### 3. Update Switch Status
* **Method:** `PATCH`
* **URL:** `/switches/:id/status` (Replace `:id` with actual switch ID, e.g. `SW-1001`)
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Updates the status of a switch. Generates an audit log.
* **Request Body (JSON):**
  ```json
  {
    "status": "Maintenance"
  }
  ```
  *(Allowed statuses: `Online`, `Maintenance`, `Offline`)*
* **Success Response (200 OK):**
  ```json
  {
    "id": "SW-1001",
    "model": "Cisco Catalyst 9300",
    "physicalDevice": "Rack A-01",
    "config": "Core routing + VLAN trunking",
    "status": "Maintenance"
  }
  ```

---

### C. Alerts Endpoints

#### 1. Fetch Alerts
* **Method:** `GET`
* **URL:** `/alerts`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Fetches all network alert events.
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": "7ca64b22-8d76-419b-a3bd-b0f329971bc1",
      "switchId": "SW-1003",
      "clusterName": "Testing Cluster",
      "severity": "critical",
      "status": "Offline",
      "timestamp": 1718365200000,
      "acknowledged": false
    }
  ]
  ```

#### 2. Generate Mock Alert
* **Method:** `POST`
* **URL:** `/alerts`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Triggers creation of a mock alert event for testing.
* **Success Response (200 OK):**
  ```json
  {
    "id": "a821e25e-26f5-4089-bc8d-6a5bb1fae134",
    "switchId": "SW-1005",
    "clusterName": "Closet Cluster",
    "severity": "warning",
    "status": "Maintenance",
    "timestamp": 1718365450000,
    "acknowledged": false
  }
  ```

#### 3. Acknowledge Alert
* **Method:** `PATCH`
* **URL:** `/alerts/:id/acknowledge` (Replace `:id` with actual UUID of the alert)
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Marks a specific alert as acknowledged.
* **Success Response (200 OK):**
  ```json
  {
    "id": "7ca64b22-8d76-419b-a3bd-b0f329971bc1",
    "acknowledged": true
  }
  ```

---

### D. Analytics Endpoints

#### 1. Fetch Analytics Data
* **Method:** `GET`
* **URL:** `/analytics`
* **Protected:** **Yes** (Requires JWT token)
* **Description:** Computes and returns statistics about switches status counts, alerts counts, and historical data points for UI charts.
* **Success Response (200 OK):**
  ```json
  {
    "switchesStatus": {
      "online": 4,
      "maintenance": 1,
      "offline": 1,
      "total": 6
    },
    "alertsCount": {
      "active": 3,
      "critical": 1,
      "warning": 2
    },
    "uptimeHistory": [
      { "date": "2026-07-08", "uptime": 99.8 },
      { "date": "2026-07-09", "uptime": 99.9 }
    ]
  }
  ```

---

## 4. Testing with Postman (Quick Start)

### Step 1: Login to get your JWT Token
1. In Postman, start a new request.
2. Set the method to `POST` and URL to `http://localhost:3000/api/auth/login`.
3. Add a header under **Headers**:
   * Key: `Content-Type`, Value: `application/json`
4. Under **Body**, choose **raw**, select **JSON**, and enter:
   ```json
   {
     "email": "admin@network.local",
     "password": "admin123"
   }
   ```
5. Click **Send**. Copy the `token` string returned in the response payload.

### Step 2: Make a Protected Request (e.g. Adding a Switch)
1. Set the method to `POST` and URL to `http://localhost:3000/api/switches`.
2. Under **Headers**, configure:
   * Key: `Content-Type`, Value: `application/json`
   * Key: `Authorization`, Value: `Bearer <PASTE_YOUR_COPIED_TOKEN_HERE>`
3. Under **Body** (raw -> JSON), enter the switch details:
   ```json
   {
     "id": "SW-2026",
     "model": "Arista DCS-7050",
     "physicalDevice": "Rack A-05",
     "config": "Uplinks to main distributor",
     "status": "Online"
   }
   ```
4. Click **Send** to register the switch.
