📘 Diffie–Hellman Key Exchange (Client–Server using WASM & Next.js)

->This project implements a Diffie–Hellman shared secret key exchange between a client and a server, following the exact requirements provided in the lab test.

->The frontend matches the layout from the provided PDF (light-blue panel containing input boxes for p and g with a “CONNECT” button).

📂 Project Structure
```
my-wasm-dh-app/
│
├── public/
│   └── mycode.wasm           # WebAssembly output compiled from myProg.c
│
├── src/
│   ├── app/
│   │   ├── layout.js         # App layout (root HTML/BODY)
│   │   ├── page.js           # Frontend UI (blue box + CONNECT button)
│   │   └── api/
│   │       └── compute/
│   │           └── route.js  # Server DH computation endpoint
│   │
│   └── lib/
│       └── wasm.js           # WASM loader (client & server compatible)
│
├── myProg.c                  # C file: implements modexp() -> compiled to WASM
├── package.json
└── next.config.js
```

🚀 Features

Client Side:

->User enters prime number p and generator g.

->Client generates a random secret a.

Computes:
```
        x = g^a mod p
```
->using WASM modexp(), or JS fallback if WASM not loaded.


Sends { g, p, x } to server at:
```
        POST /api/compute
```

->Displays the server response { y, K } and the client secret a.

Server Side:

Receives { g, p, x }.

->Generates random secret b.

Computes:
```
        y = g^b mod p      (public key)
        K = x^b mod p      (shared secret)
```

->using the same WASM module.

->Sends { y, K } back to client

🛠️ Setup Instructions

1. Install Dependencies
```
        npm install
```

2. Compile C Program to WebAssembly

->Ensure Emscripten (emcc) is installed and activated.

Compile:
```
        emcc myProg.c -O3 \
        -s EXPORTED_FUNCTIONS='["_modexp"]' \
        -o public/mycode.wasm
```

Confirm the file exists:
```
        ls public/mycode.wasm
```

3. Run Development Server
```
        npm run dev
```

Visit:
```
        http://localhost:3000
```


🧪 How It Works (DH Key Exchange Overview)

->Client picks secret a.

Client sends:
```
        p, g, x = g^a mod p
```

->Server picks secret b.

Server computes:
```
        y = g^b mod p
        K = x^b mod p
```

Client computes:
```
        K = y^a mod p
```

->Both client & server now share the same secret key K without ever exchanging a or b.


🎨 Frontend UI (Matches PDF)

The UI includes:

->Centered light-blue box

->Labels: “Enter the Value of p”, “Enter the Value of g”

->Matching white input boxes

->Grey CONNECT button

->Minimal inline styling (no external CSS needed)

This is implemented in:
```
        src/app/page.js
```


🔧 Server Route

API endpoint:
```
        POST /api/compute
```

Exists at:
```
        src/app/api/compute/route.js
```

This file:

->Parses { g, p, x }

->Generates random b

->Computes y and K

->Responds with JSON

🧩 WASM Loader

Located at:
```
        src/lib/wasm.js\
```

Features:

Loads mycode.wasm in both browser and Next.js server.

Exposes:
```
        modexp(g, a, p)
```

Automatically falls back to JS powered modexp if WASM fails (for troubleshooting).

🔍 Debug Tips

->If “CONNECT” is not working:

->Check browser console (F12 → Console).

->heck API network request (F12 → Network → /api/compute).

->Ensure public/mycode.wasm exists.

->Confirm server logs in terminal running npm run dev.

Test API manually:
```
        curl -X POST http://localhost:3000/api/compute \
        -H "Content-Type: application/json" \
        -d '{"g":2,"p":211,"x":5}'
```

📦 Building for Production
```
        npm run build
        npm run start
```
        
📝 Notes

->Works with Next.js App Router (src/app).

->WASM is optional at runtime; JS fallback ensures the UI still works.
