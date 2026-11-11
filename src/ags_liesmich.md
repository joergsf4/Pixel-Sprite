# Sprites für Adventure Game Studio

Dieser Ordner wird mit `node cli.js ags` erzeugt. Er enthält die Figuren und Büroobjekte in der Form, die Adventure Game Studio (AGS) erwartet.

**Stand:** Der Export folgt den Regeln von AGS 3.x, ist aber noch nicht in AGS selbst ausprobiert. Menünamen können je nach Version leicht abweichen.

## Inhalt

| Pfad | Inhalt |
|---|---|
| `figuren/<name>/<name>_loop<N>_<richtung>_<bild>.png` | Einzelbilder je Schleife, Bild 0 ist das Standbild |
| `figuren/<name>/<name>_raster.png` | dieselben Bilder als Raster: eine Zeile je Schleife, eine Spalte je Bild |
| `objekte/<name>.png` | Büroobjekte, auf ihren Umriss beschnitten |
| `raum_leer.png` | leerer Testraum, 320×200 |

Alle Bilder sind PNGs mit Alphakanal. Durchsichtig ist wirklich durchsichtig, es gibt keine halbtransparenten Pixel.

## Spiel einrichten

- Auflösung 320×200, Farbtiefe 32 Bit (True Color). In einem 8-Bit-Palettenspiel funktionieren die Bilder nicht ohne Weiteres.
- Beim Import die Transparenz aus dem Alphakanal übernehmen und nicht aus einer Hintergrundfarbe ableiten.

## Figuren

AGS erwartet je Figur eine „View“ mit vier Schleifen in fester Reihenfolge. Die Dateinamen tragen diese Reihenfolge schon:

| Schleife | Richtung | Dateien |
|---|---|---|
| 0 | nach vorn (zum Betrachter) | `…_loop0_vorn_0.png` bis `_6.png` |
| 1 | nach links | `…_loop1_links_…` |
| 2 | nach rechts | `…_loop2_rechts_…` |
| 3 | nach hinten | `…_loop3_hinten_…` |

Bild 0 jeder Schleife ist das Standbild, die Bilder 1 bis 6 sind die Gehphasen. Die linke Schleife ist bereits gespiegelt geliefert, im Editor muss also nichts auf „Flipped“ gestellt werden.

Vorgehen:

1. Im Sprite-Manager die Einzelbilder einer Figur importieren (alle Dateien auf einmal, nach Namen sortiert). Alternativ das Raster importieren und mit der Zellengröße aus der Tabelle unten zerschneiden lassen.
2. Eine neue View anlegen und je Schleife die sieben Sprites in Reihenfolge zuweisen.
3. Der Figur diese View als normale View (Gehen) zuweisen.
4. Die Werte aus der Tabelle eintragen.

| Figur | Bildgröße | Bilder je Schleife | Gehtempo X | Gehtempo Y | Animationsverzögerung |
|---|---|---|---|---|---|
__FIGUREN__

- **Gehtempo X** ist der Weg in Pixeln je Gehphase. Nur mit diesem Wert rutschen die Füße nicht über den Boden.
- Dazu muss die Bewegung an die Animation gekoppelt sein (`MovementLinkedToAnimation`, in den Einstellungen der Figur; das ist die Voreinstellung).
- X und Y getrennt einstellen (`UniformMovementSpeed` aus). Im Skript geht das so:

```
// in game_start()
cHero.SetWalkSpeed(3, 1);
cHero.AnimationSpeed = 4;
```

- Die Animationsverzögerung gilt für die AGS-Voreinstellung von 40 Spielschleifen je Sekunde und ergibt 10 Bilder je Sekunde.
- AGS setzt eine Figur mit der unteren Mitte ihres Sprites auf ihre Position. Die Bilder sind deshalb unten bündig beschnitten und waagerecht zentriert.

Was fehlt: Views für Sprechen, Leerlauf und Blinzeln gibt es noch nicht. AGS zeigt beim Sprechen dann das Standbild.

## Objekte

Die Büroobjekte werden als normale Sprites importiert und im Raum als Objekt platziert oder fest in den Hintergrund gemalt. Dateien mit `_schraeg` zeigen das Objekt um 30° gedreht. Der Maßstab passt zu den Figuren.

AGS richtet Raumobjekte an ihrer linken unteren Ecke aus und nimmt deren Unterkante als Grundlinie dafür, ob eine Figur davor oder dahinter gezeichnet wird. Das passt für diese Sprites ohne Korrektur.

| Datei | Objekt | Größe |
|---|---|---|
__OBJEKTE__

## Testraum

`raum_leer.png` ist ein leerer Raum mit Wand, Sockel und Dielenboden in Spielauflösung. Der Boden beginnt bei Y = 112; die begehbare Fläche sollte darunter liegen.
