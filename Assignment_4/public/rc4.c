#include<stdio.h>
#include<string.h>
#include<stdlib.h>

unsigned char S[256];

void swap(unsigned char *a, unsigned char *b) {
    unsigned char temp = *a;
    *a = *b;
    *b = temp;
}

// Intialization
void RC4Init(unsigned char *key, int keylen) {
    int i, j = 0;

    // Step 1: Initialize S
    for (i = 0; i < 256; i++)
        S[i] = i;

    // Step 2: Scramble S with key
    for (i = 0; i < 256; i++) {
        j = (j + S[i] + key[i % keylen]) % 256;
        swap(&S[i], &S[j]);
    }
}


void RC4(unsigned char *data, int len, unsigned char *key, int keylen) {
    RC4Init(key, keylen);

    int i = 0, j = 0;
    unsigned char K;
    int p;

    for (int p = 0; p < len; p++) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;

        swap(&S[i], &S[j]);

        K = S[(S[i] + S[j]) % 256];

        data[p] ^= K;
    }
}

int main(int argc, char *argv[]){
    if (argc != 4) {
        printf("Usage: %s <keyfile> <inputfile> <outputfile>\n", argv[0]);
        return 1;
    }

    // --- Read key ---
    FILE *fk = fopen(argv[1], "rb");
    if (!fk) {
        perror("Key file error");
        return 1;
    }

    unsigned char key[256];
    int keylen = fread(key, 1, 256, fk);
    fclose(fk);

    if (keylen == 0) {
        printf("Key file is empty.\n");
        return 1;
    }


    // Read plaintext or ciphertext input
    FILE *fin = fopen(argv[2], "rb");
    if (!fin) {
        perror("Input file error");
        return 1;
    }

    fseek(fin, 0, SEEK_END);
    int len = ftell(fin);
    rewind(fin);

    unsigned char *buffer = malloc(len);
    fread(buffer, 1, len, fin);
    fclose(fin);

    // Encrypt and Decrypt with random key generation per byte using the input key
    RC4(buffer, len, key, keylen);


    // ---------- Write Output ----------
    FILE *fout = fopen(argv[3], "wb");
    fwrite(buffer, 1, len, fout);
    fclose(fout);

    free(buffer);

    printf("Operation complete.\n");

    return 0;
}