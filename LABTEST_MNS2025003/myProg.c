#include <stdio.h>
#include <stdint.h>

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

int main() {
    uint64_t a, b, n;
    printf("Enter a, b, n: ");
    scanf("%lu %lu %lu", &a, &b, &n);

    printf("%lu^%lu mod %lu = %lu\n", a, b, n, modexp(a, b, n));
    return 0;
}

