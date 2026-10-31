 1 | #include <stdint.h>
 2 | #include "uart.h"
 3 |
 4 | #define TAILLE_MAX 512
 5 |
 6 | static uint8_t tampon[TAILLE_MAX];
 7 |
 8 | /* Recopie une trame reçue et calcule sa somme de contrôle (somme des octets modulo 256). */
 9 | uint8_t recevoir_trame(uint16_t longueur)
10 | {
11 |     uint8_t somme = 0;
12 |
13 |     if (longueur > TAILLE_MAX)
14 |         return 0;
15 |
16 |     for (uint8_t i = 0; i < longueur; i++) {
17 |         tampon[i] = uart_lire_octet();
18 |         somme += tampon[i];
19 |     }
20 |     return somme;
21 | }
