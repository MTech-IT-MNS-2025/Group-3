#include <stdint.h>

// pure computation: no scanf, no printf, no input/output
uint32_t modexp(uint32_t g, uint32_t a, uint32_t p) {
    uint64_t result = 1;
    uint64_t base = g % p;

    while (a > 0) {
        if (a & 1) {
            result = (result * base) % p;
        }
        base = (base * base) % p;
        a >>= 1;
    }

    return (uint32_t)result;
}

