 1 | #define SEUIL 5
 2 |
 3 | /* Appelée toutes les 10 ms par le timer. */
 4 | bool lire_bouton_depart(void)
 5 | {
 6 |     static uint8_t compteur = 0;
 7 |     static bool etat = false;
 8 |     bool brut = HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_3) == GPIO_PIN_RESET;
 9 |
10 |     if (brut != etat) {
11 |         if (++compteur >= SEUIL) {
12 |             etat = brut;
13 |             compteur = 0;
14 |         }
15 |     } else {
16 |         compteur = 0;
17 |     }
18 |     return etat;
19 | }
