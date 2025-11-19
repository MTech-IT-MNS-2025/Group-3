#include <stdio.h>
#include <stdint.h>
#include<stdlib.h>

uint64_t modexp(uint64_t a, uint64_t b, uint64_t n) {
    uint64_t result = 1;
    a = a % n;  // reduce 'a' first

    while (b > 0) {
        if (b & 1) {              // if b is odd
            result = (result * a) % n;
        }
        a = (a * a) % n;          // square base
        b >>= 1;                  // divide b by 2
    }

    return result;
}

int main(int argc, char *argv[]) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s <a> <b> <n>\n", argv[0]);
        return 1;
    }

    uint64_t a = strtoull(argv[1], NULL, 10);
    uint64_t b = strtoull(argv[2], NULL, 10);
    uint64_t n = strtoull(argv[3], NULL, 10);

    uint64_t result = modexp(a, b, n);

    // print ONLY the result so Node.js execFile can read it
    printf("%llu\n", result);

    return 0;
}





// emcc modexp.c -O3 \
//   -s WASM=1 \
//   -s MODULARIZE=1 \
//   -s 'EXPORT_NAME="ModExpModule"' \
//   -s EXPORTED_FUNCTIONS='["_modexp"]' \
//   -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
//   -o ../public/modexp.js
