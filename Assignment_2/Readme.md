# 🔐 Exploring Post-Quantum Cryptography with liboqs

## 🚀 Project Overview
This project explores **Post-Quantum Cryptography (PQC)** using the [Open Quantum Safe (liboqs)](https://openquantumsafe.org/liboqs/) library.  
It demonstrates how classical public-key cryptosystems like **RSA** and **ECC** are vulnerable to quantum attacks and how **post-quantum algorithms** such as **Kyber** and **Falcon** can replace them.

Through this project, you’ll:
- Explore the **KEM** (Key Encapsulation Mechanisms) and **SIG** (Digital Signature Schemes).
- Implement practical demos for **key exchange** and **digital signatures** using liboqs.
- Measure and compare performance and key sizes against classical algorithms.

---

## 🧩 Learning Objectives
1. Learn to build and use the `liboqs` library.
2. Implement **Kyber512** (PQC Key Encapsulation Mechanism).
3. Implement **Falcon-512** (PQC Digital Signature Scheme).
4. Compare classical (RSA-2048, ECDSA-P256) vs PQC algorithms:
   - Key sizes  
   - Ciphertext / Signature sizes  
   - Execution time  
5. Understand PQC integration challenges in real-world systems.

---

## 🧠 Background
### Classical vs Post-Quantum Cryptography
| Property | Classical | Post-Quantum |
|-----------|------------|--------------|
| Security basis | Integer factoring / Discrete log | Lattice, hash, code, or multivariate problems |
| Quantum vulnerability | ❌ Broken by Shor’s Algorithm | ✅ Resistant |
| Examples | RSA, ECC, DH | Kyber, Saber, Falcon, Dilithium, SPHINCS+ |
| Role | Key exchange, signatures | Quantum-safe replacements |

### Why PQC Matters
Quantum computers can break RSA-2048 and ECDSA in seconds once scaled.  
To maintain **Confidentiality, Integrity, and Authentication (CIA)**, we must migrate to PQC primitives.

---

## ⚙️ Installation (Fedora Example)
```bash
sudo dnf install -y cmake ninja-build git gcc-c++ openssl-devel doxygen graphviz valgrind python3-pytest unzip
git clone -b main https://github.com/open-quantum-safe/liboqs.git
cd liboqs
mkdir build && cd build
cmake -GNinja .. -DCMAKE_BUILD_TYPE=Release
ninja
sudo ninja install
```


## 🧰 Compilation
```bash
git clone https://github.com/Fuzzy-programmer/pqc_liboqs_learning.git

cd Assignment_2

gcc kem_kyber512.c -o kem_kyber512 -loqs -lcrypto -lssl

gcc sign_falcon512.c -o sign_falcon512 -loqs -lcrypto -lssl

gcc list_algos.c -o list_algo -loqs -lcrypto -lssl

```

### By using cmake and make

```bash
mkdir build
cd build
cmake ..
make

```
## 📁 Project Structure
```text
├── list_algorithms.c      # Lists supported KEMs and SIGs  
├── kem_demo.c             # Demonstrates Kyber512 key encapsulation  
├── sig_demo.c             # Demonstrates Falcon-512 digital signature  
├── report.pdf             # Contains performance results and analysis  
├── CMakeLists.txt         # Build configuration  
├── contriblist.txt        # Contributers List  
└── README.md              # Project documentation
```  

## 📊 Results and Analysis of Practicality
The comparative study between RSA-2048, ECDSA-P256, Kyber512, and Falcon-512 is detailed in the 📄 [Report](./Report.pdf).

Key Insights:
Key Sizes: PQC keys are generally larger than ECDSA but often smaller than RSA in some schemes.

Performance: Kyber and Falcon offer practical execution times suitable for real-world deployment.

Trade-offs:  
Security vs. Key Size: Larger keys strengthen security but increase bandwidth usage.
Signature vs. Verification Time: Some PQC schemes have larger signatures, but their verification is fast and efficient.

For complete data tables and timing metrics, refer to the [full report](./Report.pdf).

## 📜 License
This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.

## 🧠 Key Takeaways
- PQC focuses on quantum-resistant problems like lattices instead of factoring.
- KEM replaces traditional asymmetric key exchange mechanisms.
- SIG provides secure authentication and integrity in a quantum-safe way.
- Symmetric cryptography (e.g., AES-256, SHA3) largely remains unaffected but may need longer keys.

## 👤 Author
Dr. SowmyaDev Maity || Lohith  || Hemanth || Pranav || Aditya 
💡 Exploring Quantum-Safe Cryptography with liboqs

## 📚 References

+ [Open Quantum Safe Project](https://openquantumsafe.org/)
+ [NIST Post-Quantum Cryptography Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
+ [Kyber Specification (NIST Submission)](https://pq-crystals.org/kyber/)
+ [Falcon Specification (NIST Submission)](https://falcon-sign.info/)
+ [liboqs GitHub Repository](https://github.com/open-quantum-safe/liboqs)