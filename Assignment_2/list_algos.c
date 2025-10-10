#include <stdio.h>
#include <stdlib.h>
#include <oqs/oqs.h>

int main(void) {
    printf("==== List of KEM Algorithms ====\n\n");

    for (size_t i = 0; i < OQS_KEM_alg_count(); i++) {
        const char *alg_name = OQS_KEM_alg_identifier(i);
        printf("[%zu] %s\n", i + 1, alg_name);

        OQS_KEM *kem = OQS_KEM_new(alg_name);
        if (kem == NULL) {
            printf("   ⚠️  Could not initialize KEM: %s\n\n", alg_name);
            continue;
        }

        printf("   Public key length : %zu bytes\n", kem->length_public_key);
        printf("   Secret key length : %zu bytes\n", kem->length_secret_key);
        printf("   Ciphertext length : %zu bytes\n", kem->length_ciphertext);
        printf("   Shared secret len : %zu bytes\n\n", kem->length_shared_secret);

        OQS_KEM_free(kem);
    }

    printf("==== List of Signature Algorithms ====\n\n");

    for (size_t i = 0; i < OQS_SIG_alg_count(); i++) {
        const char *sig_name = OQS_SIG_alg_identifier(i);
        printf("[%zu] %s\n", i + 1, sig_name);

        OQS_SIG *sig = OQS_SIG_new(sig_name);
        if (sig == NULL) {
            printf("   ⚠️  Could not initialize SIG: %s\n\n", sig_name);
            continue;
        }

        printf("   Public key length : %zu bytes\n", sig->length_public_key);
        printf("   Secret key length : %zu bytes\n", sig->length_secret_key);
        printf("   Signature length  : %zu bytes\n\n", sig->length_signature);

        OQS_SIG_free(sig);
    }

    return 0;
}
