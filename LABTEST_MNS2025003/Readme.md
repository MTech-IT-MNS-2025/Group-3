# 🔐 Diffie–Hellman Key Exchange  (Next.js + WebAssembly (myProg.c) )

A Web-based Diffie–Hellman Key Exchange System demonstrating how native C code can be executed on both:

* Client → via WebAssembly (WASM)
* Server → via a natively compiled C binary

to compute modular exponentiation securely and efficiently.

This project shows end-to-end integration of:  
C → WebAssembly → JavaScript → Next.js Frontend → Next.js API → Native C  
to establish a shared secret key between a client and a server.

---

## 🧭 Project Overview

This project was developed to demonstrate how Diffie–Hellman Key Exchange (DHKE) can be implemented in a modern web environment:

* Client-side exponentiation (g^a mod p) happens using C compiled to WASM

* Server-side exponentiation (g^b mod p and x^b mod p) happens using native C executed from Next.js

The system performs the complete DH key exchange:

1. Client randomly generates private key a

2. Computes x = gᵃ mod p using WASM

3. Sends <g, p, x> to server

4. Server generates private key b

5. Computes:
    * y = gᵇ mod p
    * K = xᵇ mod p

6. Returns <K, y> to the client

7. Client displays <a, y, K> as the shared secret key exchange result

---

## 🧰 Technologies Used

| **Category**      | **Technology**                              | **Purpose**                                                    |
| ----------------- | ------------------------------------------- | -------------------------------------------------------------- |
| **Core Logic**    | C (`myProg.c`)                              | Implements modular exponentiation for DHKE                     |
| **Client Engine** | WebAssembly (WASM)                          | Runs `modexp` from C in the browser via WASM                   |
| **WASM Loader**   | Custom JS Loader (`wasmLoader.js`)          | Loads & wraps `myProg.wasm` for client-side DH calculations    |
| **WASM Runtime**  | Emscripten-generated JS (`myProg.js`)       | WebAssembly bootstrapping & runtime environment                |
| **Frontend**      | Next.js (React)                             | UI, form handling, client-side computations                    |
| **Backend**       | Next.js API Routes (`pages/api/compute.js`) | Performs server-side DH computations using WASM or fallback JS |
| **Cryptography**  | JavaScript BigInt + Web Crypto              | Random number generation & fallback modular exponentiation     |
| **Styling**       | Inline CSS (no framework)                   | Basic layout and styling in `index.js`                         |
| **Platform**      | Ubuntu Linux                                   | OS which is used for developing the project        |

---

## 🌐 Key Features

🔐 Real Diffie–Hellman Key Exchange between client & server

🔐 Real Diffie–Hellman Key Exchange between client and server 

⚙️ Client uses WASM to compute gᵃ mod p 

⚙️ Server uses native C to compute gᵇ mod p and xᵇ mod p 

🔄 JSON-based communication between client and server 

📡 Server API executes native C using execFile 

📊 UI displays:
* Shared secret key K
* Server public key y
* Client private key a

🎨 Clean UI for entering p and g, and generating values

---

## 🎯 Objective

To learn how native C programs can be compiled to WebAssembly and used inside a Next.js frontend, while also executing native C on the backend to perform:

* Fast modular exponentiation

* Full Diffie–Hellman key exchange


---

## 📚 Learning Outcomes

✔️ How to compile C → WebAssembly using Emscripten 

✔️ How to expose C functions to JavaScript using Emscripten bindings 

✔️ How to load and use WASM modules in Next.js 

✔️ How to execute native C programs from a Next.js API route 

✔️ How to pass data between WASM memory and JS 

✔️ How Diffie–Hellman Key Exchange works internally

---



## ⚙️ Installation & Running Locally

### 🧩 Prerequisites

| Tool        | Description                     | Version      |
|-------------|----------------------------------|--------------|
| Node.js     | JavaScript runtime (Next.js)     | >= 18.x      |
| Emscripten  | C → WASM compiler toolchain      | Latest (as used to generate myProg.js/myProg.wasm) |
| WebAssembly | Runtime for executing C in JS    | Browser + Node built-in |

### 🔧 Install Emscripten

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
emcc myProg.c   -O3   -s STANDALONE_WASM=1   -s EXPORTED_FUNCTIONS='["_modexp"]'   -o ./public/myProg.wasm   -Wl,--no-entry

```

### 1️⃣ Clone the repository

```bash
git clone https://github.com/MTech-IT-MNS-2025/Group-3.git
cd Group-3/LABTEST_MNS2025003
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Build WASM + Start Next.js

```bash
npm run build
npm start
```

### 4️⃣ Open browser

👉 [http://localhost:3000](http://localhost:3000)

---

## 🗂️ Project Structure

```text
LABTEST_MNS2025003/
│
├── pages/
│   ├── index.js          # Frontend user interface
│   └── api/
│       └── compute.js    # Server-side DH computations (invokes native binary)
│
├── lib/
│   └── wasmLoader.js     # Loads and wraps public/myProg.wasm for client-side use
│
├── public/
│   └── myProg.wasm       # Compiled WebAssembly from myProg.c (for browser)
│
├── bin/
│   └── myProg_native     # Compiled native binary from myProg.c (for server)
│
├── myProg.c              # Given C source (from question paper) — local path: /mnt/data/myProg.c
└── README.md

```
---

## 🏁 Submission Requirement
```
md5sum file_name.zip
```
---

## 📜 License

This project is licensed under the MIT License.  
See the [LICENSE](../LICENSE) file for details.


---

