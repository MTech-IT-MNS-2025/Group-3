#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <oqs/oqs.h>
#include <openssl/evp.h>
#include <openssl/rsa.h>
#include <openssl/ec.h>
#include <openssl/pem.h>

double time_diff(struct timespec start, struct timespec end) {
    return (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;
}

void pqc_signature_demo() {
    const char *message = "Post-Quantum Cryptography is the future";
    size_t message_len = strlen(message);

    printf("=== Post-Quantum Signature: Falcon-512 ===\n");

    OQS_SIG *sig = OQS_SIG_new("Falcon-512");
    if (!sig) { printf("Falcon-512 not supported!\n"); return; }

    uint8_t *public_key = malloc(sig->length_public_key);
    uint8_t *secret_key = malloc(sig->length_secret_key);
    uint8_t *signature  = malloc(sig->length_signature);
    size_t signature_len;

    struct timespec t1, t2;

    // Key generation
    clock_gettime(CLOCK_MONOTONIC, &t1);
    if (OQS_SIG_keypair(sig, public_key, secret_key) != OQS_SUCCESS) {
        printf("Keypair generation failed!\n");
        return;
    }
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("KeyGen Time (s): %.6f\n", time_diff(t1, t2));

    // Signing
    clock_gettime(CLOCK_MONOTONIC, &t1);
    if (OQS_SIG_sign(sig, signature, &signature_len, (const uint8_t*)message, message_len, secret_key) != OQS_SUCCESS) {
        printf("Signing failed!\n");
        return;
    }
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Sign Time (s): %.6f\n", time_diff(t1, t2));

    // Verification
    clock_gettime(CLOCK_MONOTONIC, &t1);
    int verify = OQS_SIG_verify(sig, (const uint8_t*)message, message_len, signature, signature_len, public_key);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Verify Time (s): %.6f\n", time_diff(t1, t2));

    printf("Signature verification: %s\n", verify == OQS_SUCCESS ? "SUCCESS" : "FAILURE");
    printf("Public key length: %zu bytes\n", sig->length_public_key);
    printf("Secret key length: %zu bytes\n", sig->length_secret_key);
    printf("Signature length: %zu bytes\n", signature_len);

    OQS_SIG_free(sig);
    free(public_key);
    free(secret_key);
    free(signature);
}

void rsa_signature_demo() {
    const char *message = "Post-Quantum Cryptography is the future";
    size_t message_len = strlen(message);

    printf("\n=== Classical Signature: RSA-2048 ===\n");

    EVP_PKEY *pkey = NULL;
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
    if (!ctx) return;

    struct timespec t1, t2;

    // KeyGen
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_PKEY_keygen_init(ctx);
    EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 2048);
    EVP_PKEY_keygen(ctx, &pkey);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("KeyGen Time (s): %.6f\n", time_diff(t1, t2));

    EVP_MD_CTX *mdctx = EVP_MD_CTX_new();
    EVP_PKEY_CTX *pctx = NULL;
    size_t siglen;

    // Sign
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_DigestSignInit(mdctx, &pctx, EVP_sha256(), NULL, pkey);
    EVP_DigestSign(mdctx, NULL, &siglen, (const unsigned char*)message, message_len);
    unsigned char *sig = malloc(siglen);
    EVP_DigestSign(mdctx, sig, &siglen, (const unsigned char*)message, message_len);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Sign Time (s): %.6f\n", time_diff(t1, t2));

    // Verify
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_DigestVerifyInit(mdctx, &pctx, EVP_sha256(), NULL, pkey);
    int verify = EVP_DigestVerify(mdctx, sig, siglen, (const unsigned char*)message, message_len);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Verify Time (s): %.6f\n", time_diff(t1, t2));

    printf("Public key size (approx): 256 bytes\n");
    printf("Private key size (approx): 1190 bytes (PEM)\n");
    printf("Signature size: %zu bytes\n", siglen);
    printf("Signature verification: %s\n", verify == 1 ? "SUCCESS" : "FAILURE");

    free(sig);
    EVP_MD_CTX_free(mdctx);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);
}

void ecdsa_signature_demo() {
    const char *message = "Post-Quantum Cryptography is the future";
    size_t message_len = strlen(message);

    printf("\n=== Classical Signature: ECDSA-P256 ===\n");

    EVP_PKEY *pkey = NULL;
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_EC, NULL);
    if (!ctx) return;

    struct timespec t1, t2;

    // KeyGen
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_PKEY_keygen_init(ctx);
    EVP_PKEY_CTX_set_ec_paramgen_curve_nid(ctx, NID_X9_62_prime256v1);
    EVP_PKEY_keygen(ctx, &pkey);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("KeyGen Time (s): %.6f\n", time_diff(t1, t2));

    EVP_MD_CTX *mdctx = EVP_MD_CTX_new();
    EVP_PKEY_CTX *pctx = NULL;
    size_t siglen;

    // Sign
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_DigestSignInit(mdctx, &pctx, EVP_sha256(), NULL, pkey);
    EVP_DigestSign(mdctx, NULL, &siglen, (const unsigned char*)message, message_len);
    unsigned char *sig = malloc(siglen);
    EVP_DigestSign(mdctx, sig, &siglen, (const unsigned char*)message, message_len);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Sign Time (s): %.6f\n", time_diff(t1, t2));

    // Verify
    clock_gettime(CLOCK_MONOTONIC, &t1);
    EVP_DigestVerifyInit(mdctx, &pctx, EVP_sha256(), NULL, pkey);
    int verify = EVP_DigestVerify(mdctx, sig, siglen, (const unsigned char*)message, message_len);
    clock_gettime(CLOCK_MONOTONIC, &t2);
    printf("Verify Time (s): %.6f\n", time_diff(t1, t2));

    printf("Public key size: 64 bytes (x||y)\n");
    printf("Private key size: 32 bytes\n");
    printf("Signature size: %zu bytes\n", siglen);
    printf("Signature verification: %s\n", verify == 1 ? "SUCCESS" : "FAILURE");

    free(sig);
    EVP_MD_CTX_free(mdctx);
    EVP_PKEY_free(pkey);
    EVP_PKEY_CTX_free(ctx);
}

int main() {
    pqc_signature_demo();
    rsa_signature_demo();
    ecdsa_signature_demo();
    return 0;
}
