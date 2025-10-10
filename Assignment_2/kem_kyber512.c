#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <oqs/oqs.h>
#include <time.h>


int main() {
    const char *alg_name = "Kyber512";

    // Initialize KEM
    OQS_KEM *kem = OQS_KEM_new(alg_name);
    if (kem == NULL) {
        printf("KEM %s not available on this system\n", alg_name);
        return EXIT_FAILURE;
    }

    // Buffers
    uint8_t *alice_pk = malloc(kem->length_public_key);
    uint8_t *alice_sk = malloc(kem->length_secret_key);
    uint8_t *bob_ct = malloc(kem->length_ciphertext);
    uint8_t *alice_ss = malloc(kem->length_shared_secret);
    uint8_t *bob_ss   = malloc(kem->length_shared_secret);

    struct timespec t1, t2;
    double keygen_time, encap_time, decap_time;

    // --- Key generation ---
    clock_gettime(CLOCK_MONOTONIC, &t1);
    if (OQS_KEM_keypair(kem, alice_pk, alice_sk) != OQS_SUCCESS) {
        printf("Key generation failed\n");
        return EXIT_FAILURE;
    }
    clock_gettime(CLOCK_MONOTONIC, &t2);
    keygen_time = (t2.tv_sec - t1.tv_sec) + (t2.tv_nsec - t1.tv_nsec)/1e9;

    // --- Encapsulation (Bob) ---
    clock_gettime(CLOCK_MONOTONIC, &t1);
    if (OQS_KEM_encaps(kem, bob_ct, bob_ss, alice_pk) != OQS_SUCCESS) {
        printf("Encapsulation failed\n");
        return EXIT_FAILURE;
    }
    clock_gettime(CLOCK_MONOTONIC, &t2);
    encap_time = (t2.tv_sec - t1.tv_sec) + (t2.tv_nsec - t1.tv_nsec)/1e9;

    // --- Decapsulation (Alice) ---
    clock_gettime(CLOCK_MONOTONIC, &t1);
    if (OQS_KEM_decaps(kem, alice_ss, bob_ct, alice_sk) != OQS_SUCCESS) {
        printf("Decapsulation failed\n");
        return EXIT_FAILURE;
    }
    clock_gettime(CLOCK_MONOTONIC, &t2);
    decap_time = (t2.tv_sec - t1.tv_sec) + (t2.tv_nsec - t1.tv_nsec)/1e9;

    // --- Compare secrets ---
    if (memcmp(alice_ss, bob_ss, kem->length_shared_secret) == 0) {
        printf("Shared secret successfully established!\n");
    } else {
        printf("Shared secret mismatch!\n");
    }

    printf("Alice's secret: ");
    for (size_t i = 0; i < kem->length_shared_secret; i++)
        printf("%02X", alice_ss[i]);
    printf("\n");

    printf("Bob's secret:   ");
    for (size_t i = 0; i < kem->length_shared_secret; i++)
        printf("%02X", bob_ss[i]);
    printf("\n");

    printf("\nTimings (seconds):\n");
    printf("Key generation: %.6f\n", keygen_time);
    printf("Encapsulation: %.6f\n", encap_time);
    printf("Decapsulation: %.6f\n", decap_time);

    // --- Cleanup ---
    OQS_MEM_secure_free(alice_pk, kem->length_public_key);
    OQS_MEM_secure_free(alice_sk, kem->length_secret_key);
    OQS_MEM_secure_free(bob_ct, kem->length_ciphertext);
    OQS_MEM_secure_free(alice_ss, kem->length_shared_secret);
    OQS_MEM_secure_free(bob_ss, kem->length_shared_secret);
    OQS_KEM_free(kem);

    return EXIT_SUCCESS;
}
