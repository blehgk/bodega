# Pieles de Bodega

Una **piel** es un archivo CSS que se carga después de `styles.css` y cambia la
apariencia sin tocar la estructura, el HTML ni el JavaScript. La app trae once.

La piel elegida se guarda en `localStorage` (es de esta computadora, no del
negocio) y se aplica antes del primer pintado desde `temas/boot.js`, así no hay
parpadeo al abrir.

## Contrato

Toda piel redefine estos doce valores. Lo que la base pinte con ellos queda
dentro de la piel sin repetir regla por regla:

| Token | Qué pinta |
|---|---|
| `--papel` | fondo de la app |
| `--papel-hueso` | fondo de celdas y campos |
| `--papel-banda` | bandas y cabeceras de tabla |
| `--tinta` | texto y líneas principales |
| `--tinta-2` | texto secundario |
| `--tinta-3` | texto apagado |
| `--rojo` | lo que hay que mirar: stock mínimo, totales negativos |
| `--linea` | valor completo de borde (`1px solid …`) |
| `--linea-suave` | borde de separación interna |
| `--condensada` | voz de rótulos y etiquetas |
| `--texto` | voz del cuerpo |
| `--mono` | voz de los números |

Después de los tokens, una piel puede redefinir cualquier componente
(`.producto`, `.ticket`, `th`, `button.primario`…) para agregar lo que un token
no alcanza: radios, sombras, desenfoques, tipografía.

**Lo que una piel no hace:** cambiar el layout, el orden de los elementos, ni
esconder información. Si una piel necesita eso, no es una piel.

## Agregar una piel

1. Copiá una existente de `temas/` como punto de partida.
2. Redefiní los doce tokens y los componentes que necesites.
3. Agregala al manifiesto en `temas/index.js` con `id`, `nombre`, `nota` y `archivo`.
4. Sacá una captura a 1400×900 y guardala en `docs/skins/<id>.png`:

```bash
BODEGA_SHOT=docs/skins/mi-piel.png BODEGA_TAB=caja BODEGA_TEMA=mi-piel \
  xvfb-run -a --server-args="-screen 0 1400x900x24" npx electron . --no-sandbox
```

## Las once

| id | Origen | De qué va |
|---|---|---|
| `almanaque` | propia | Papel de diario, tinta y un rojo. La original. |
| `ios-glass` | iOS 26 | Capas translúcidas con desenfoque y bordes de luz. |
| `ios-clasico` | iOS 15 | Listas agrupadas, separadores de medio píxel. |
| `one-ui` | Samsung | Bloques grandes, radios de 26px, aire. |
| `material` | Android 12+ | Superficies teñidas y elevación. |
| `glass` | tendencia 2020 | Vidrio esmerilado sobre degradado. |
| `neumorfismo` | tendencia 2020 | Relieve por luz, sin bordes. |
| `fluent` | Windows 11 | Mica, radio de 8px, línea de acento. |
| `brutal` | web 2021 | Borde negro de 3px y sombra dura. |
| `terminal` | consola | Fósforo verde, todo monoespaciado. |
| `editorial` | imprenta | Serif, reglas finas, aire. |

## Lo que se probó y lo que no

Probado con capturas reales a 1400×900 en las once pieles, y a 1024×600 en las
que más aprietan (`ios-glass`, `brutal`, `terminal`). No se probó en pantallas
de 4K ni con escalado de Windows al 150%, donde los bordes de 0.5px pueden
desaparecer.
