Write A Story – Spielbeschreibung
"Write A Story" ist ein digitales Gruppenspiel, das die sprachlichen Fähigkeiten von Kindern im Alter von 7 bis 10 Jahren fördert. Es zielt darauf ab, Kreativität, Vokabular, Satzstruktur und Vorstellungskraft durch gemeinsames Geschichtenerzählen zu stärken. Das Spiel ist ideal für mehrsprachige Kinder oder solche, die Unterstützung beim verbalen Ausdruck benötigen. Es spielt im Kontext eines Schulhofs (z. B. "OGS-Schulhof") und integriert die Rolle des Story-Gods, der W-Fragen wie "Wo?", "Was?" und "Wie?" beantwortet. Ziel ist es, eine kohärente, kindgerechte und persönliche Kurzgeschichte zu erstellen, die durch die Zusammenarbeit der Spieler entsteht.
Eine KI generiert Sätze basierend auf den Eingaben der Spieler, wobei alle ausgewählten Wörter einbezogen werden, um eine lustige, sinnvolle und einfache Geschichte zu schaffen.
Spielbeschreibung
Ziel des Spiels
Die Spieler arbeiten zusammen, um eine Kurzgeschichte zu erstellen, indem sie Rollen übernehmen, Wörter auswählen oder Charaktere verwalten. Die KI generiert Sätze, die alle ausgewählten Wörter enthalten, und nach mehreren Runden entsteht eine vollständige, kreative Geschichte.
Rollen und ihre Funktionen
Jeder Spieler übernimmt eine Rolle, die pro Runde wechselt. Die Rollen sind:
1.
Story-God
o
Aufgabe: Beantwortet die W-Fragen "Wo?" (Ort), "Was?" (Aktion) und "Wie?" (Beschreibung) mit je einem Wort aus speziellen Listen.
o
Beispiel: "Sandkasten", "spielen", "glücklich"
2.
Nomen-Wächter
o
Aufgabe: Wählt ein Nomen aus einer humorvollen und detaillierten Liste.
o
Beispiel: "Drache"
3.
Verben-Wächter
o
Aufgabe: Wählt ein Verb aus einer humorvollen und detaillierten Liste.
o
Beispiel: "fliegen"
4.
Adjektiv-Wächter
o
Aufgabe: Wählt ein Adjektiv aus einer humorvollen und detaillierten Liste.
o
Beispiel: "riesig"
5.
Character-God
o
Aufgabe: Verwaltet bis zu fünf Charaktere, die die Geschichte persönlicher machen. Änderungen sind nach Runde 1 eingeschränkt.
o
Beispiel: "Alice", "Bob"
Tabelle der Rollen
Rolle
Funktion
Story-God
Wählt ein Wort für "Wo?" (Orte), "Was?" (Verben), "Wie?" (Adjektive).
Nomen-Wächter
Wählt ein Nomen aus einer humorvollen/detaillierten Liste.
Verben-Wächter
Wählt ein Verb aus einer humorvollen/detaillierten Liste.
Adjektiv-Wächter
Wählt ein Adjektiv aus einer humorvollen/detaillierten Liste.
Character-God
Verwaltet bis zu 5 Charaktere, mit Änderungseinschränkungen nach Runde 1.
Farbliche Kennzeichnung und Avatare
Jeder Spieler erhält eine individuelle Farbe zugewiesen. Diese Farbe umrandet die Wörter, die der Spieler ausgewählt hat, im finalen Satz. So weiß jedes Kind – auch wenn die Wörter konjugiert oder verändert wurden – welche Wörter von ihm stammen und wie es den Satz beeinflusst hat. Die Umrandungen sind für alle Spieler sichtbar, sodass jeder die Beiträge der anderen sehen kann. Dies fördert das Verständnis der eigenen Rolle in der Geschichte und die Teamdynamik.
•
Beispiel: Wenn Spieler 1 (Farbe Blau) "Drache" auswählt und es im Satz als "Drachen" erscheint, wird "Drachen" blau umrandet.
•
Geplante Erweiterung: Sobald das Spiel stabil läuft und Extras implementiert werden, erhält jeder Spieler einen generierten Avatar, der neben seiner Farbe angezeigt wird, um die Identifikation zu verbessern.
Die technische Umsetzung der farblichen Kennzeichnung erfolgt entweder durch eine KI-API, die die Zuordnung übernimmt, oder durch eine Funktion mit spaCy, die die Grundform der Wörter erkennt und die korrekte Zuordnung ermöglicht.
Satzgenerierung durch die KI
Die KI erstellt Sätze mit folgenden Prioritäten:
1.
Einbeziehung aller Wörter: Alle ausgewählten Wörter müssen enthalten sein.
2.
Kohärenz und Sinnhaftigkeit: Der Satz soll logisch und verständlich sein.
3.
Einfachheit: Der Satz muss kindgerecht und leicht verständlich bleiben.
Beispiel für einen generierten Satz mit farblicher Kennzeichnung
•
Eingaben:
o
Story-God (Spieler 1, Blau): "Sandkasten" (Wo?), "spielen" (Was?), "glücklich" (Wie?)
o
Nomen-Wächter (Spieler 2, Rot): "Drache"
o
Verben-Wächter (Spieler 3, Grün): "fliegen"
o
Adjektiv-Wächter (Spieler 4, Gelb): "riesig"
o
Character-God (Spieler 5, Lila): "Alice und Bob"
•
Generierter Satz: "Alice und Bob spielen glücklich im Sandkasten, als ein riesiger Drache vorbeifliegt."
o
Blau umrandet: "Sandkasten", "spielen", "glücklich" (Spieler 1)
o
Rot umrandet: "Drache" (Spieler 2)
o
Grün umrandet: "fliegen" (Spieler 3)
o
Gelb umrandet: "riesig" (Spieler 4)
o
Lila umrandet: "Alice und Bob" (Spieler 5)
Spielablauf
1.
Einrichtung und Beitritt
o
Spieler wählen Benutzernamen und treten einem Raum bei, der vom Spielerleiter (GM) mit einem 5-stelligen Code erstellt wird.
2.
Raumkonfiguration
o
Der GM konfiguriert Wortlisten für:
▪
Orte ("Wo?")
▪
Aktionen ("Was?")
▪
Beschreibungen ("Wie?")
▪
Nomen
▪
Verben
▪
Adjektive
▪
Charaktere
o
Standardlisten sind verfügbar, aber der GM kann eigene Eingaben machen.
3.
Rollenzuweisung
o
Jeder Spieler erhält eine Rolle, die jede Runde rotiert.
4.
Spielplay
o
Der Story-God wählt Wörter für "Wo?", "Was?" und "Wie?".
o
Die Wächter wählen je ein Wort aus ihren Listen.
o
Der Character-God legt die Charaktere fest (Änderungen nur in Runde 1).
o
Die KI generiert einen Satz, der in einer Nachrichtenliste mit farblicher Kennzeichnung angezeigt wird.
5.
Automatischer Rundenübergang
o
Nach einer kurzen Verzögerung (z. B. 10 Sekunden) startet die nächste Runde.
6.
Finale Geschichte
o
Nach einer festgelegten Anzahl von Runden (Standard: 5) endet das Spiel. Die vollständige Geschichte wird als Liste von Sätzen mit farblicher Kennzeichnung angezeigt.
Beispiel für eine fertige Geschichte (nach 3 Runden)
1.
"Alice und Bob spielen glücklich im Sandkasten, als ein riesiger Drache vorbeifliegt."
2.
"Im Klassenzimmer lernt Alice laut, während ein kleiner Vogel zwitschert."
3.
"Auf dem Schulhof rennt Bob schnell, als ein bunter Ball rollt."
Technische Implementierung
Frontend
•
Technologien: HTML, JavaScript, Socket.IO
•
Funktion: Echtzeitkommunikation und Anzeige der Benutzeroberfläche mit farblicher Kennzeichnung.
Backend
•
Technologien: Node.js mit Express und Socket.IO
•
Funktion: Verwaltung der Spielräume, Rollenzuweisung, Weiterleitung an die KI und Zuweisung von Farben/Avataren.
KI-Integration
•
Technologie: Google Gemini API
•
Funktion: Generierung kindgerechter Sätze.
•
Erweiterung: KI-API oder spaCy-Funktion zur Erkennung der Grundform der Wörter für die farbliche Zuordnung.
Bildungswert
•
Vokabular: Kinder lernen neue Wörter und deren Einsatz.
•
Satzstruktur: Übung im Kombinieren von Wörtern zu Sätzen.
•
Kreativität: Anregung der Fantasie durch Wort- und Charakterauswahl.
•
Teamarbeit: Förderung sozialer Fähigkeiten durch Zusammenarbeit.
•
Selbstwirksamkeit: Farbliche Kennzeichnung zeigt den eigenen Einfluss auf die Geschichte.
Empfehlungen für zukünftige Updates
•
Avatar-Generierung: Jeder Spieler erhält einen individuellen Avatar.
•
Erweiterte Wortlisten: Mehr Optionen für kreativere Geschichten.
•
Interaktive Elemente: Feedback der Kinder zur Verbesserung der KI.
