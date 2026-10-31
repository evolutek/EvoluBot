 1 | /* ATmega328P à 16 MHz : le Timer0 déclenche TIMER0_COMPA toutes les 1 ms. */
 2 | #include <avr/io.h>
 3 | #include <avr/interrupt.h>
 4 | #include <stdint.h>
 5 |
 6 | static uint32_t ticks_ms = 0;
 7 |
 8 | ISR(TIMER0_COMPA_vect)
 9 | {
10 |     ticks_ms++;
11 | }
12 |
13 | void timer_init(void)
14 | {
15 |     TCCR0A = (1 << WGM01);
16 |     TCCR0B = (1 << CS01) | (1 << CS00);
17 |     OCR0A = 249;
18 |     TIMSK0 = (1 << OCIE0A);
19 |     sei();
20 | }
21 |
22 | /* Attend `duree` millisecondes : sert à cadencer le funny action de fin de match. */
23 | void attendre_ms(uint32_t duree)
24 | {
25 |     uint32_t debut = ticks_ms;
26 |     while (ticks_ms - debut < duree) {
27 |         /* rien */
28 |     }
29 | }
